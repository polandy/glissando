import { WebGlSetupError } from "./webgl-setup-error";

/** One transparent texel, sampled in place of a card layer that has no visible card. */
export class EmptyCardTexture {
  readonly #gl: WebGL2RenderingContext;
  #texture: WebGLTexture;

  constructor(gl: WebGL2RenderingContext) {
    this.#gl = gl;
    this.#texture = this.#create();
  }

  get texture(): WebGLTexture {
    return this.#texture;
  }

  /** The context was restored: the old texture is gone. */
  recreate(): void {
    this.#texture = this.#create();
  }

  dispose(): void {
    this.#gl.deleteTexture(this.#texture);
  }

  #create(): WebGLTexture {
    const gl = this.#gl;
    const texture = gl.createTexture();
    if (texture === null) {
      throw new WebGlSetupError(
        "could not set up the empty card texture: createTexture returned null",
      );
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA8,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array(4),
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    return texture;
  }
}
