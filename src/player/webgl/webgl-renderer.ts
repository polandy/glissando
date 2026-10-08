import type { BrowserPicture } from "../browser/picture-loader";
import { cropRect, type Size } from "../ken-burns";
import type { RenderFrame, SlideLayer, SlideRenderer } from "../ports";
import { TRANSITION_EFFECTS, type TransitionEffect } from "../slideshow";
import { fragmentShader, VERTEX_SHADER } from "./transition-shaders";

/** A single slide is a crossfade that has not started. */
const SINGLE_SLIDE_EFFECT: TransitionEffect = "crossfade";
const FULL_SCREEN_TRIANGLE_STRIP = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
const VERTEX_COUNT = 4;
const POSITION_ATTRIBUTE = 0;
const COORDINATES_PER_VERTEX = 2;
const FROM_TEXTURE_UNIT = 0;
const TO_TEXTURE_UNIT = 1;

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
  "progress",
  "aspect",
] as const;
type UniformName = (typeof UNIFORM_NAMES)[number];

/** Draws slides and the GLSL transitions into a canvas that fills its container. */
export class WebGlRenderer implements SlideRenderer<BrowserPicture> {
  readonly #canvas: HTMLCanvasElement;
  readonly #gl: WebGL2RenderingContext;
  readonly #programs: ReadonlyMap<TransitionEffect, EffectProgram>;
  readonly #textures = new Map<HTMLImageElement, WebGLTexture>();
  readonly #pixelRatio: () => number;
  readonly #resizeObserver: ResizeObserver;

  constructor(
    canvas: HTMLCanvasElement,
    gl: WebGL2RenderingContext,
    onResize: () => void,
    pixelRatio: () => number = () => devicePixelRatio,
  ) {
    this.#canvas = canvas;
    this.#gl = gl;
    this.#pixelRatio = pixelRatio;
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, FULL_SCREEN_TRIANGLE_STRIP, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(POSITION_ATTRIBUTE);
    gl.vertexAttribPointer(POSITION_ATTRIBUTE, COORDINATES_PER_VERTEX, gl.FLOAT, false, 0, 0);
    this.#programs = new Map(TRANSITION_EFFECTS.map((effect) => [effect, this.#compile(effect)]));
    this.#resizeObserver = new ResizeObserver(onResize);
    this.#resizeObserver.observe(canvas);
  }

  render(frame: RenderFrame<BrowserPicture>): void {
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
    gl.uniform1f(uniforms.progress, progress);
    gl.uniform1f(uniforms.aspect, viewport.width / viewport.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, VERTEX_COUNT);
  }

  forget(picture: BrowserPicture): void {
    const texture = this.#textures.get(picture.element);
    if (texture !== undefined) {
      this.#gl.deleteTexture(texture);
      this.#textures.delete(picture.element);
    }
  }

  dispose(): void {
    this.#resizeObserver.disconnect();
    this.#textures.forEach((texture) => this.#gl.deleteTexture(texture));
    this.#textures.clear();
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
