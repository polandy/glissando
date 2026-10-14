import type { CardItemSlice } from "../card-item-layout";
import type { Size } from "../ken-burns";

/**
 * Draws a card's title/subtitle texture one slice at a time, each its own quad with its own
 * opacity and drift (ADR-0032, `dev-docs/player/TITLE_CARDS.md` § Entrances): the WebGL
 * counterpart of the DOM renderer's per-item spans, sampling the same texture `card-raster.ts`
 * rasterised once instead of drawing its own text.
 */

const VERTEX_SHADER = `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D card;
uniform float opacity;
out vec4 fragColor;
void main() {
  fragColor = texture(card, vUv) * opacity;
}`;

const POSITION_ATTRIBUTE = 0;
const UV_ATTRIBUTE = 1;
const FLOATS_PER_VERTEX = 4;
const VERTEX_COUNT = 4;
const QUAD_FLOATS = FLOATS_PER_VERTEX * VERTEX_COUNT;

export class CardItemProgramCompileError extends Error {
  constructor(log: string) {
    super(`the card item shader does not compile or link: ${log}`);
    this.name = "CardItemProgramCompileError";
  }
}

/** An item's own slice (pixel space, top-left origin) plus its entrance's own visual. */
export interface CardItemDraw {
  readonly slice: CardItemSlice;
  readonly opacity: number;
  readonly driftEm: number;
  readonly scale: number;
}

/** One quad per item, sampling `texture`'s slice of it (ADR-0032); additive-over premultiplied. */
export class CardItemProgram {
  readonly #gl: WebGL2RenderingContext;
  readonly #program: WebGLProgram;
  readonly #buffer: WebGLBuffer;
  readonly #cardUniform: WebGLUniformLocation | null;
  readonly #opacityUniform: WebGLUniformLocation | null;
  readonly #quad = new Float32Array(QUAD_FLOATS);

  constructor(gl: WebGL2RenderingContext) {
    this.#gl = gl;
    this.#program = compile(gl);
    this.#cardUniform = gl.getUniformLocation(this.#program, "card");
    this.#opacityUniform = gl.getUniformLocation(this.#program, "opacity");
    const buffer = gl.createBuffer();
    if (buffer === null) {
      throw new CardItemProgramCompileError("createBuffer returned null");
    }
    this.#buffer = buffer;
  }

  /** Binds this program and its vertex layout; call once before any `draw` this frame. */
  use(): void {
    const gl = this.#gl;
    gl.useProgram(this.#program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#buffer);
    gl.enableVertexAttribArray(POSITION_ATTRIBUTE);
    gl.vertexAttribPointer(POSITION_ATTRIBUTE, 2, gl.FLOAT, false, FLOATS_PER_VERTEX * 4, 0);
    gl.enableVertexAttribArray(UV_ATTRIBUTE);
    gl.vertexAttribPointer(UV_ATTRIBUTE, 2, gl.FLOAT, false, FLOATS_PER_VERTEX * 4, 2 * 4);
  }

  /** One item's quad: its slice drifted and scaled about its own centre, sampling that slice of
   * `texture` (rasterised at `viewport`'s size, so the slice's own pixels are its texture coordinates). */
  draw(texture: WebGLTexture, unit: number, viewport: Size, item: CardItemDraw): void {
    const gl = this.#gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(this.#cardUniform, unit);
    gl.uniform1f(this.#opacityUniform, item.opacity);
    fillQuad(this.#quad, item, viewport);
    gl.bufferData(gl.ARRAY_BUFFER, this.#quad, gl.STREAM_DRAW);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, VERTEX_COUNT);
  }

  dispose(): void {
    this.#gl.deleteProgram(this.#program);
    this.#gl.deleteBuffer(this.#buffer);
  }
}

/** The quad's four corners (clip space) and texture coordinates, bottom pair then top pair. */
function fillQuad(out: Float32Array, item: CardItemDraw, viewport: Size): void {
  const { slice } = item;
  const driftPx = item.driftEm * slice.fontSizePx;
  const centerX = slice.x + slice.width / 2;
  const centerY = slice.y + slice.height / 2 + driftPx;
  const halfW = (slice.width / 2) * item.scale;
  const halfH = (slice.height / 2) * item.scale;
  const left = centerX - halfW;
  const right = centerX + halfW;
  const top = centerY - halfH;
  const bottom = centerY + halfH;

  const uLeft = slice.x / viewport.width;
  const uRight = (slice.x + slice.width) / viewport.width;
  const vTop = slice.y / viewport.height;
  const vBottom = (slice.y + slice.height) / viewport.height;

  const ndcX = (px: number) => (px / viewport.width) * 2 - 1;
  const ndcY = (py: number) => 1 - (py / viewport.height) * 2;

  out.set([
    ndcX(left),
    ndcY(bottom),
    uLeft,
    vBottom,
    ndcX(right),
    ndcY(bottom),
    uRight,
    vBottom,
    ndcX(left),
    ndcY(top),
    uLeft,
    vTop,
    ndcX(right),
    ndcY(top),
    uRight,
    vTop,
  ]);
}

function compile(gl: WebGL2RenderingContext): WebGLProgram {
  const program = gl.createProgram();
  for (const [type, source] of [
    [gl.VERTEX_SHADER, VERTEX_SHADER],
    [gl.FRAGMENT_SHADER, FRAGMENT_SHADER],
  ] as const) {
    const shader = gl.createShader(type);
    if (shader === null) {
      throw new CardItemProgramCompileError("createShader returned null");
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new CardItemProgramCompileError(gl.getShaderInfoLog(shader) ?? "no log");
    }
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.bindAttribLocation(program, POSITION_ATTRIBUTE, "position");
  gl.bindAttribLocation(program, UV_ATTRIBUTE, "uv");
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new CardItemProgramCompileError(gl.getProgramInfoLog(program) ?? "no log");
  }
  return program;
}
