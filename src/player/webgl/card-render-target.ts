import type { Size } from "../ken-burns";
import { setLinearClamped } from "./caption-textures";

export class CardRenderTargetError extends Error {
  constructor(reason: string) {
    super(`could not set up a card render target: ${reason}`);
    this.name = "CardRenderTargetError";
  }
}

/**
 * An offscreen framebuffer holding one layer's rasterised card items for this frame, at stage
 * resolution, so the transition shader can sample it exactly as it samples that layer's picture
 * (ADR-0032). One instance is kept per layer slot (`from`/`to`) for the renderer's lifetime; its
 * texture storage is reallocated only when the viewport size changes, never per frame.
 */
export class CardRenderTarget {
  readonly #gl: WebGL2RenderingContext;
  readonly #framebuffer: WebGLFramebuffer;
  #texture: WebGLTexture;
  #size: Size = { width: 0, height: 0 };

  constructor(gl: WebGL2RenderingContext) {
    this.#gl = gl;
    const framebuffer = gl.createFramebuffer();
    if (framebuffer === null) {
      throw new CardRenderTargetError("createFramebuffer returned null");
    }
    this.#framebuffer = framebuffer;
    this.#texture = this.#createTexture();
  }

  get texture(): WebGLTexture {
    return this.#texture;
  }

  /**
   * Binds this target's framebuffer at `viewport`'s size (reallocating its storage only when
   * that size changed since the last call), clears it to transparent, runs `draw`, then restores
   * the default framebuffer and `viewport` as the GL viewport.
   */
  renderInto(viewport: Size, draw: () => void): void {
    const gl = this.#gl;
    this.#resize(viewport);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.#framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.#texture, 0);
    gl.viewport(0, 0, viewport.width, viewport.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    draw();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, viewport.width, viewport.height);
  }

  /** The context was restored: the old framebuffer's texture is gone; draw into a fresh one. */
  recreate(): void {
    this.#texture = this.#createTexture();
    this.#size = { width: 0, height: 0 };
  }

  dispose(): void {
    this.#gl.deleteFramebuffer(this.#framebuffer);
    this.#gl.deleteTexture(this.#texture);
  }

  #resize(size: Size): void {
    if (size.width === this.#size.width && size.height === this.#size.height) {
      return;
    }
    this.#size = size;
    const gl = this.#gl;
    gl.bindTexture(gl.TEXTURE_2D, this.#texture);
    // A sized internal format (not plain RGBA), as WebGL2 requires for a colour-renderable
    // texture attached to a framebuffer.
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA8,
      size.width,
      size.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
  }

  #createTexture(): WebGLTexture {
    const gl = this.#gl;
    const texture = gl.createTexture();
    if (texture === null) {
      throw new CardRenderTargetError("createTexture returned null");
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    setLinearClamped(gl);
    return texture;
  }
}
