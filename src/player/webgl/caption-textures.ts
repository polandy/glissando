import { captionFont, captionMetrics } from "../caption-layout";
import type { Size } from "../ken-burns";
import { rasterizeCaption } from "./caption-raster";

/** Loads a font before text is drawn with it; `document.fonts` is one. */
export interface CaptionFonts {
  load(font: string): Promise<unknown>;
}

/** Any size loads the face; the caption's own size changes with the screen. */
const FONT_LOAD_SIZE_PX = 16;
const TRANSPARENT_PIXEL = new Uint8Array([0, 0, 0, 0]);

interface CaptionTexture {
  readonly texture: WebGLTexture;
  readonly caption: string;
  readonly viewport: Size;
  /** Browser zoom changes it without changing the viewport's device pixels. */
  readonly pixelRatio: number;
}

/**
 * One texture per slide with a caption, holding its band (see `rasterizeCaption`), premultiplied
 * for the shaders. Drawn once the caption font has loaded; again when the viewport, the
 * pixel ratio or the caption changes. A slide without a caption, or before the font loaded, gets a transparent one.
 */
export class CaptionTextures {
  readonly #gl: WebGL2RenderingContext;
  readonly #pixelRatio: () => number;
  readonly #canvas = document.createElement("canvas");
  readonly #textures = new Map<object, CaptionTexture>();
  #transparent: WebGLTexture;
  #fontLoaded = false;
  /** Settles once captions can be drawn; `onFontLoaded` has run by then. */
  readonly fontLoaded: Promise<void>;

  constructor(
    gl: WebGL2RenderingContext,
    fonts: CaptionFonts,
    pixelRatio: () => number,
    onFontLoaded: () => void,
  ) {
    this.#gl = gl;
    this.#pixelRatio = pixelRatio;
    this.#transparent = this.#createTransparent();
    this.fontLoaded = fonts
      .load(captionFont(FONT_LOAD_SIZE_PX))
      .catch((error: unknown) => {
        console.error("the caption font did not load; captions use a fallback font", error);
      })
      .then(() => {
        this.#fontLoaded = true;
        onFontLoaded();
      });
  }

  /** The band's height as a share of the viewport's, the same for every caption. */
  bandShare(viewport: Size): number {
    return captionMetrics(viewport, this.#pixelRatio()).bandHeight / viewport.height;
  }

  /** `owner` is what the caption is released with, the slide's picture. */
  texture(owner: object, caption: string | undefined, viewport: Size): WebGLTexture {
    if (caption === undefined || !this.#fontLoaded) {
      return this.#transparent;
    }
    const existing = this.#textures.get(owner);
    const pixelRatio = this.#pixelRatio();
    if (
      existing?.caption === caption &&
      existing.pixelRatio === pixelRatio &&
      existing.viewport.width === viewport.width &&
      existing.viewport.height === viewport.height
    ) {
      return existing.texture;
    }
    const gl = this.#gl;
    const texture = existing?.texture ?? gl.createTexture();
    rasterizeCaption(this.#canvas, caption, viewport, pixelRatio);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.#canvas);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    setLinearClamped(gl);
    this.#textures.set(owner, { texture, caption, viewport, pixelRatio });
    return texture;
  }

  forget(owner: object): void {
    const existing = this.#textures.get(owner);
    if (existing !== undefined) {
      this.#gl.deleteTexture(existing.texture);
      this.#textures.delete(owner);
    }
  }

  /** The context was restored: every texture is gone with the old one and is drawn anew. */
  recreate(): void {
    this.#textures.clear();
    this.#transparent = this.#createTransparent();
  }

  dispose(): void {
    this.#textures.forEach(({ texture }) => this.#gl.deleteTexture(texture));
    this.#textures.clear();
    this.#gl.deleteTexture(this.#transparent);
  }

  #createTransparent(): WebGLTexture {
    const gl = this.#gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, TRANSPARENT_PIXEL);
    setLinearClamped(gl);
    return texture;
  }
}

function setLinearClamped(gl: WebGL2RenderingContext): void {
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}
