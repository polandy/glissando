import type { BitmapPicture } from "../browser/bitmap-loader";
import { cropRect, type Size } from "../ken-burns";
import type { PreparedSlide, RenderFrame, SlideLayer, SlideRenderer } from "../ports";
import { TRANSITION_EFFECTS, type TransitionEffect } from "../slideshow";
import { CaptionTextures, type CaptionFonts } from "./caption-textures";
import { PictureTextures } from "./picture-textures";
import { fragmentShader, VERTEX_SHADER } from "./transition-shaders";

/** A single slide is a crossfade that has not started. */
const SINGLE_SLIDE_EFFECT: TransitionEffect = "crossfade";
const FULL_SCREEN_TRIANGLE_STRIP = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
const VERTEX_COUNT = 4;
const POSITION_ATTRIBUTE = 0;
const COORDINATES_PER_VERTEX = 2;
const FROM_TEXTURE_UNIT = 0;
const TO_TEXTURE_UNIT = 1;
const FROM_CAPTION_TEXTURE_UNIT = 2;
const TO_CAPTION_TEXTURE_UNIT = 3;

export class ShaderCompileError extends Error {
  constructor(effect: TransitionEffect, log: string) {
    super(`the ${effect} shader does not compile or link: ${log}`);
    this.name = "ShaderCompileError";
  }
}

interface EffectProgram {
  readonly program: WebGLProgram;
  readonly uniforms: Readonly<Record<UniformName, WebGLUniformLocation | null>>;
}

const UNIFORM_NAMES = [
  "fromPicture",
  "toPicture",
  "fromCrop",
  "toCrop",
  "fromCaption",
  "toCaption",
  "progress",
  "aspect",
  "captionBand",
  "captionInset",
] as const;
type UniformName = (typeof UNIFORM_NAMES)[number];

export interface WebGlRendererOptions {
  /** Device pixels per CSS pixel. */
  readonly pixelRatio?: () => number;
  /** Loads the caption font; captions are drawn once it has. */
  readonly fonts?: CaptionFonts;
}

/** Draws slides and the GLSL transitions into a canvas that fills its container. */
export class WebGlRenderer implements SlideRenderer<BitmapPicture> {
  readonly #canvas: HTMLCanvasElement;
  readonly #gl: WebGL2RenderingContext;
  readonly #onResize: () => void;
  #programs: ReadonlyMap<TransitionEffect, EffectProgram> = new Map();
  readonly #pictures: PictureTextures;
  readonly #pixelRatio: () => number;
  readonly #captions: CaptionTextures;
  #captionInsetCssPixels = 0;
  readonly #resizeObserver: ResizeObserver;
  /** Set between `webglcontextlost` and `webglcontextrestored`; no GL call is safe meanwhile. */
  #contextLost = false;

  constructor(
    canvas: HTMLCanvasElement,
    gl: WebGL2RenderingContext,
    onResize: () => void,
    { pixelRatio = () => devicePixelRatio, fonts = document.fonts }: WebGlRendererOptions = {},
  ) {
    this.#canvas = canvas;
    this.#gl = gl;
    this.#onResize = onResize;
    this.#pixelRatio = pixelRatio;
    this.#setUpGlResources();
    this.#pictures = new PictureTextures(gl);
    this.#captions = new CaptionTextures(gl, fonts, pixelRatio, onResize);
    canvas.addEventListener("webglcontextlost", this.#handleContextLost);
    canvas.addEventListener("webglcontextrestored", this.#handleContextRestored);
    this.#resizeObserver = new ResizeObserver(onResize);
    this.#resizeObserver.observe(canvas);
  }

  /** The vertex buffer, its attribute binding and every transition's shader program. */
  #setUpGlResources(): void {
    const gl = this.#gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, FULL_SCREEN_TRIANGLE_STRIP, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(POSITION_ATTRIBUTE);
    gl.vertexAttribPointer(POSITION_ATTRIBUTE, COORDINATES_PER_VERTEX, gl.FLOAT, false, 0, 0);
    this.#programs = new Map(TRANSITION_EFFECTS.map((effect) => [effect, this.#compile(effect)]));
  }

  readonly #handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.#contextLost = true;
  };

  /**
   * The lost context destroyed every GL object; rebuild them, then let the player redraw.
   * Textures are not re-uploaded here: they are uploaded anew, from the bitmaps the player still
   * holds, when each picture is next prepared or drawn.
   */
  readonly #handleContextRestored = (): void => {
    this.#pictures.recreate();
    this.#setUpGlResources();
    this.#captions.recreate();
    this.#contextLost = false;
    this.#onResize();
  };

  render(frame: RenderFrame<BitmapPicture>): void {
    if (this.#contextLost) {
      return;
    }
    const gl = this.#gl;
    const viewport = this.#fitCanvasToDisplay();
    gl.viewport(0, 0, viewport.width, viewport.height);
    const [effect, progress, from, to] =
      frame.kind === "slide"
        ? [SINGLE_SLIDE_EFFECT, 0, frame.slide, frame.slide]
        : [frame.effect, frame.progress, frame.from, frame.to];
    const { program, uniforms } = this.#program(effect);
    gl.useProgram(program);
    this.#bindLayer(FROM_TEXTURE_UNIT, from, uniforms.fromPicture, uniforms.fromCrop, viewport);
    this.#bindLayer(TO_TEXTURE_UNIT, to, uniforms.toPicture, uniforms.toCrop, viewport);
    this.#bindCaption(FROM_CAPTION_TEXTURE_UNIT, from, uniforms.fromCaption, viewport);
    this.#bindCaption(TO_CAPTION_TEXTURE_UNIT, to, uniforms.toCaption, viewport);
    gl.uniform1f(uniforms.progress, progress);
    gl.uniform1f(uniforms.aspect, viewport.width / viewport.height);
    gl.uniform1f(uniforms.captionBand, this.#captions.bandShare(viewport));
    gl.uniform1f(
      uniforms.captionInset,
      (this.#captionInsetCssPixels * this.#pixelRatio()) / viewport.height,
    );
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, VERTEX_COUNT);
  }

  /** One upload step of the picture per call, then its caption (see `PictureTextures`). */
  prepare({ picture, caption }: PreparedSlide<BitmapPicture>): void {
    if (this.#contextLost) {
      return;
    }
    if (!this.#pictures.isComplete(picture)) {
      this.#pictures.prepareStep(picture);
      return;
    }
    this.#captions.texture(picture, caption, this.#displaySize());
  }

  setCaptionInset(cssPixels: number): void {
    this.#captionInsetCssPixels = cssPixels;
  }

  /** Settles once captions can be drawn, after asking the player for a redraw. */
  get captionFontLoaded(): Promise<void> {
    return this.#captions.fontLoaded;
  }

  forget(picture: BitmapPicture): void {
    this.#captions.forget(picture);
    this.#pictures.forget(picture);
  }

  dispose(): void {
    this.#canvas.removeEventListener("webglcontextlost", this.#handleContextLost);
    this.#canvas.removeEventListener("webglcontextrestored", this.#handleContextRestored);
    this.#resizeObserver.disconnect();
    this.#pictures.dispose();
    this.#captions.dispose();
    this.#programs.forEach(({ program }) => this.#gl.deleteProgram(program));
    this.#canvas.remove();
  }

  #displaySize(): Size {
    return {
      width: Math.max(1, Math.round(this.#canvas.clientWidth * this.#pixelRatio())),
      height: Math.max(1, Math.round(this.#canvas.clientHeight * this.#pixelRatio())),
    };
  }

  #fitCanvasToDisplay(): Size {
    const { width, height } = this.#displaySize();
    if (this.#canvas.width !== width || this.#canvas.height !== height) {
      this.#canvas.width = width;
      this.#canvas.height = height;
    }
    return { width, height };
  }

  #bindLayer(
    unit: number,
    { picture, framing }: SlideLayer<BitmapPicture>,
    sampler: WebGLUniformLocation | null,
    cropUniform: WebGLUniformLocation | null,
    viewport: Size,
  ): void {
    const gl = this.#gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    this.#pictures.texture(picture);
    gl.uniform1i(sampler, unit);
    const crop = cropRect(framing, picture, viewport);
    gl.uniform4f(cropUniform, crop.x, crop.y, crop.width, crop.height);
  }

  #bindCaption(
    unit: number,
    { picture, caption }: SlideLayer<BitmapPicture>,
    sampler: WebGLUniformLocation | null,
    viewport: Size,
  ): void {
    const gl = this.#gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, this.#captions.texture(picture, caption, viewport));
    gl.uniform1i(sampler, unit);
  }

  #program(effect: TransitionEffect): EffectProgram {
    const program = this.#programs.get(effect);
    if (program === undefined) {
      throw new Error(`no shader program for the ${effect} transition`);
    }
    return program;
  }

  #compile(effect: TransitionEffect): EffectProgram {
    const gl = this.#gl;
    const program = gl.createProgram();
    for (const [type, source] of [
      [gl.VERTEX_SHADER, VERTEX_SHADER],
      [gl.FRAGMENT_SHADER, fragmentShader(effect)],
    ] as const) {
      const shader = gl.createShader(type);
      if (shader === null) {
        throw new ShaderCompileError(effect, "createShader returned null");
      }
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new ShaderCompileError(effect, gl.getShaderInfoLog(shader) ?? "no log");
      }
      gl.attachShader(program, shader);
      gl.deleteShader(shader);
    }
    gl.bindAttribLocation(program, POSITION_ATTRIBUTE, "position");
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new ShaderCompileError(effect, gl.getProgramInfoLog(program) ?? "no log");
    }
    const uniforms = Object.fromEntries(
      UNIFORM_NAMES.map((name) => [name, gl.getUniformLocation(program, name)]),
    ) as Record<UniformName, WebGLUniformLocation | null>;
    return { program, uniforms };
  }
}
