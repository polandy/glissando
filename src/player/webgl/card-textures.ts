import { CARD_FOCUS_BLUR_SHARE } from "../card-timing";
import { CARD_STYLE_SPECS, type CardTextSpec } from "../card-layout";
import { loadFonts, type FontSpec, type Fonts } from "../fonts";
import type { Size } from "../ken-burns";
import type { Card, CardStyle } from "../slideshow";
import { rasterizeCard } from "./card-raster";
import { setLinearClamped } from "./caption-textures";

const TRANSPARENT_PIXEL = new Uint8Array([0, 0, 0, 0]);

interface CardTexture {
  readonly texture: WebGLTexture;
  readonly viewport: Size;
}

function toFontSpec(spec: CardTextSpec): FontSpec {
  return {
    family: spec.fontFamily,
    weight: spec.fontWeight,
    style: spec.italic ? "italic" : "normal",
  };
}

/**
 * One texture per `Card`, holding its title and subtitle (see `rasterizeCard`), premultiplied for
 * the shaders. Drawn once that style's fonts have loaded; again when the viewport or the card
 * changes. Transparent before the fonts load, as captions are (ADR-0032). A slideshow carries at
 * most an opening and a closing card (`dev-docs/player/TITLE_CARDS.md`), so entries are kept for
 * the renderer's lifetime rather than released per slide.
 */
export class CardTextures {
  readonly #gl: WebGL2RenderingContext;
  readonly #canvas = document.createElement("canvas");
  readonly #textures = new Map<Card, CardTexture>();
  readonly #blurredTextures = new Map<Card, CardTexture>();
  readonly #blurCanvas = document.createElement("canvas");
  readonly #loadedStyles = new Set<CardStyle>();
  readonly #loading = new Map<CardStyle, Promise<void>>();
  readonly #fonts: Fonts;
  readonly #onFontLoaded: () => void;
  #transparent: WebGLTexture;

  constructor(gl: WebGL2RenderingContext, fonts: Fonts, onFontLoaded: () => void) {
    this.#gl = gl;
    this.#fonts = fonts;
    this.#onFontLoaded = onFontLoaded;
    this.#transparent = this.#createTransparent();
  }

  /**
   * Settles once `style`'s title and subtitle fonts can be drawn. Starts loading them on first
   * call, not sooner: most slideshows never show a card, let alone every style.
   */
  fontLoaded(style: CardStyle): Promise<void> {
    return this.#ensureLoading(style);
  }

  /** `card`'s rasterised texture, or a transparent one before its style's fonts have loaded. */
  texture(card: Card, viewport: Size): WebGLTexture {
    this.#ensureLoading(card.style);
    if (!this.#loadedStyles.has(card.style)) {
      return this.#transparent;
    }
    const existing = this.#textures.get(card);
    if (
      existing !== undefined &&
      existing.viewport.width === viewport.width &&
      existing.viewport.height === viewport.height
    ) {
      return existing.texture;
    }
    const gl = this.#gl;
    const texture = existing?.texture ?? gl.createTexture();
    rasterizeCard(this.#canvas, card, viewport);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.#canvas);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    setLinearClamped(gl);
    this.#textures.set(card, { texture, viewport });
    return texture;
  }

  /**
   * `card`'s cross-fade copy for `focus` (ADR-0032, `dev-docs/player/TITLE_CARDS.md` §
   * Entrances): rasterised once with a static blur of `CARD_FOCUS_BLUR_SHARE` of the viewport's
   * height, never re-blurred per frame. Transparent before its style's fonts have loaded.
   */
  blurredTexture(card: Card, viewport: Size): WebGLTexture {
    this.#ensureLoading(card.style);
    if (!this.#loadedStyles.has(card.style)) {
      return this.#transparent;
    }
    const existing = this.#blurredTextures.get(card);
    if (
      existing !== undefined &&
      existing.viewport.width === viewport.width &&
      existing.viewport.height === viewport.height
    ) {
      return existing.texture;
    }
    const gl = this.#gl;
    const texture = existing?.texture ?? gl.createTexture();
    rasterizeCard(this.#blurCanvas, card, viewport, CARD_FOCUS_BLUR_SHARE * viewport.height);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.#blurCanvas);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    setLinearClamped(gl);
    this.#blurredTextures.set(card, { texture, viewport });
    return texture;
  }

  /** The transparent texture a layer without a card binds, so nothing draws. */
  transparent(): WebGLTexture {
    return this.#transparent;
  }

  /** The context was restored: every texture is gone with the old one and is drawn anew. */
  recreate(): void {
    this.#textures.clear();
    this.#blurredTextures.clear();
    this.#transparent = this.#createTransparent();
  }

  dispose(): void {
    this.#textures.forEach(({ texture }) => this.#gl.deleteTexture(texture));
    this.#textures.clear();
    this.#blurredTextures.forEach(({ texture }) => this.#gl.deleteTexture(texture));
    this.#blurredTextures.clear();
    this.#gl.deleteTexture(this.#transparent);
  }

  #ensureLoading(style: CardStyle): Promise<void> {
    const existing = this.#loading.get(style);
    if (existing !== undefined) {
      return existing;
    }
    const promise = this.#loadStyle(style);
    this.#loading.set(style, promise);
    return promise;
  }

  #loadStyle(style: CardStyle): Promise<void> {
    const spec = CARD_STYLE_SPECS[style];
    return loadFonts(this.#fonts, [toFontSpec(spec.title), toFontSpec(spec.subtitle)])
      .catch((error: unknown) => {
        console.error(`the ${style} card font did not load; it draws with a fallback font`, error);
      })
      .then(() => {
        this.#loadedStyles.add(style);
        this.#onFontLoaded();
      });
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
