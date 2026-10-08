import type { BrowserPicture } from "../browser/picture-loader";
import { cropRect, type Size } from "../ken-burns";
import type { RenderFrame, SlideLayer, SlideRenderer } from "../ports";
import { TRANSITION_EFFECTS, type TransitionEffect } from "../slideshow";
import { CaptionTextures, type CaptionFonts } from "./caption-textures";
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
export class WebGlRenderer implements SlideRenderer<BrowserPicture> {
  readonly #canvas: HTMLCanvasElement;
  readonly #gl: WebGL2RenderingContext;
  readonly #onResize: () => void;
  #programs: ReadonlyMap<TransitionEffect, EffectProgram> = new Map();
  readonly #textures = new Map<HTMLImageElement, WebGLTexture>();
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
   * Textures are not re-uploaded here: `#texture` re-uploads lazily, from the picture elements
   * the player still holds, the next time each one is bound.
   */
  readonly #handleContextRestored = (): void => {
    this.#textures.clear();
    this.#setUpGlResources();
    this.#captions.recreate();
    this.#contextLost = false;
    this.#onResize();
  };

  render(frame: RenderFrame<BrowserPicture>): void {
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

  setCaptionInset(cssPixels: number): void {
    this.#captionInsetCssPixels = cssPixels;
  }

  /** Settles once captions can be drawn, after asking the player for a redraw. */
  get captionFontLoaded(): Promise<void> {
    return this.#captions.fontLoaded;
  }

  forget(picture: BrowserPicture): void {
    this.#captions.forget(picture.element);
    const texture = this.#textures.get(picture.element);
    if (texture !== undefined) {
      this.#gl.deleteTexture(texture);
      this.#textures.delete(picture.element);
    }
  }

  dispose(): void {
    this.#canvas.removeEventListener("webglcontextlost", this.#handleContextLost);
    this.#canvas.removeEventListener("webglcontextrestored", this.#handleContextRestored);
    this.#resizeObserver.disconnect();
    this.#textures.forEach((texture) => this.#gl.deleteTexture(texture));
    this.#textures.clear();
    this.#captions.dispose();
    this.#programs.forEach(({ program }) => this.#gl.deleteProgram(program));
    this.#canvas.remove();
  }

  #fitCanvasToDisplay(): Size {
    const width = Math.max(1, Math.round(this.#canvas.clientWidth * this.#pixelRatio()));
    const height = Math.max(1, Math.round(this.#canvas.clientHeight * this.#pixelRatio()));
    if (this.#canvas.width !== width || this.#canvas.height !== height) {
      this.#canvas.width = width;
      this.#canvas.height = height;
    }
    return { width, height };
  }

  #bindLayer(
    unit: number,
    { picture, framing }: SlideLayer<BrowserPicture>,
    sampler: WebGLUniformLocation | null,
    cropUniform: WebGLUniformLocation | null,
    viewport: Size,
  ): void {
    const gl = this.#gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, this.#texture(picture));
    gl.uniform1i(sampler, unit);
    const crop = cropRect(framing, picture, viewport);
    gl.uniform4f(cropUniform, crop.x, crop.y, crop.width, crop.height);
  }

  #bindCaption(
    unit: number,
    { picture, caption }: SlideLayer<BrowserPicture>,
    sampler: WebGLUniformLocation | null,
    viewport: Size,
  ): void {
    const gl = this.#gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, this.#captions.texture(picture.element, caption, viewport));
    gl.uniform1i(sampler, unit);
  }

  /** Uploads once per picture, with mipmaps so a 4K picture shrinks to the screen smoothly. */
  #texture(picture: BrowserPicture): WebGLTexture {
    const existing = this.#textures.get(picture.element);
    if (existing !== undefined) {
      return existing;
    }
    const gl = this.#gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, picture.element);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.#textures.set(picture.element, texture);
    return texture;
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
