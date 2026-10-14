import { CARD_STYLE_SPECS, type CardTextSpec } from "../card-layout";
import { loadFonts, type FontSpec, type Fonts } from "../fonts";
import type { Size } from "../ken-burns";
import { CARD_STYLES, type Card, type CardStyle } from "../slideshow";
import { rasterizeCard } from "./card-raster";
import { setLinearClamped } from "./caption-textures";

const TRANSPARENT_PIXEL = new Uint8Array([0, 0, 0, 0]);

interface CardTexture {
  readonly texture: WebGLTexture;
  readonly viewport: Size;
  readonly titleFontSizePx: number;
}

function toFontSpec(spec: CardTextSpec): FontSpec {
  return { family: spec.fontFamily, weight: spec.fontWeight, style: spec.italic ? "italic" : "normal" };
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
  readonly #loadedStyles = new Set<CardStyle>();
  readonly #loaded: ReadonlyMap<CardStyle, Promise<void>>;
  #transparent: WebGLTexture;

  constructor(gl: WebGL2RenderingContext, fonts: Fonts, onFontLoaded: () => void) {
    this.#gl = gl;
    this.#transparent = this.#createTransparent();
    this.#loaded = new Map(
      CARD_STYLES.map((style) => [style, this.#loadStyle(style, fonts, onFontLoaded)]),
    );
  }

  /** Settles once `style`'s title and subtitle fonts can be drawn. */
  fontLoaded(style: CardStyle): Promise<void> {
    const promise = this.#loaded.get(style);
    if (promise === undefined) {
      throw new Error(`no font spec for the ${style} card style`);
    }
    return promise;
  }

  /** `card`'s rasterised texture, or a transparent one before its style's fonts have loaded. */
  texture(card: Card, viewport: Size): WebGLTexture {
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
    const titleFontSizePx = rasterizeCard(this.#canvas, card, viewport);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.#canvas);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    setLinearClamped(gl);
    this.#textures.set(card, { texture, viewport, titleFontSizePx });
    return texture;
  }

  /** The transparent texture a layer without a card binds, so `withCard` draws nothing. */
  transparent(): WebGLTexture {
    return this.#transparent;
  }

  /** The title's rendered font size in px, for the drift uniform; 0 before its texture is drawn. */
  titleFontSizePx(card: Card): number {
    return this.#textures.get(card)?.titleFontSizePx ?? 0;
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

  #loadStyle(style: CardStyle, fonts: Fonts, onFontLoaded: () => void): Promise<void> {
    const spec = CARD_STYLE_SPECS[style];
    return loadFonts(fonts, [toFontSpec(spec.title), toFontSpec(spec.subtitle)])
      .catch((error: unknown) => {
        console.error(`the ${style} card font did not load; it draws with a fallback font`, error);
      })
      .then(() => {
        this.#loadedStyles.add(style);
        onFontLoaded();
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
