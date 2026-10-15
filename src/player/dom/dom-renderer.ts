import type { BrowserPicture } from "../browser/picture-loader";
import { captionStyles } from "../caption-style";
import type { Size } from "../ken-burns";
import type { PictureSlideLayer, RenderFrame, SlideLayer, SlideRenderer } from "../ports";
import type { Card } from "../slideshow";
import { slideLayout } from "../slide-layout";
import { CardOverlay } from "./dom-card";
import { LayerPlacement } from "./dom-layer-placement";
import { LiveVideos } from "./dom-live-video";

const OPAQUE = 1;
/** No caption fade from a card sharing the slide: fully shown. */
const CAPTION_OPAQUE = 1;

/** Marks a caption element, the band right after its slide's picture or pair/blurred-fill node. */
const CAPTION_ATTRIBUTE = "data-caption";
/** Marks the end-fade overlay, drawn over everything regardless of the layers below it. */
const END_FADE_ATTRIBUTE = "data-end-fade";

/** One layer of a frame, placed this render: its anchor node and the key its card, if any, lives under. */
interface PlacedLayer {
  readonly layer: SlideLayer<BrowserPicture>;
  readonly opacity: number;
  readonly anchor: HTMLElement;
}

/**
 * The fallback without WebGL2: each slide is its picture element (or, paired or blurred-filled,
 * a few, see `dom-layer-placement.ts`) or, for a ground slide, a solid colour element, framed by
 * a CSS transform, with its caption and its title card (ADR-0032) right after it, outside that
 * transform. Every transition effect becomes a crossfade (ADR-0028).
 */
export class DomRenderer implements SlideRenderer<BrowserPicture> {
  readonly #host: HTMLElement;
  readonly #resizeObserver: ResizeObserver;
  readonly #captions = new Map<HTMLImageElement, HTMLElement>();
  readonly #placement: LayerPlacement;
  readonly #cards: CardOverlay;
  readonly #videos = new LiveVideos();
  readonly #endFade: HTMLElement;
  #captionInsetCssPixels = 0;

  constructor(container: HTMLElement, onResize: () => void) {
    this.#host = document.createElement("div");
    Object.assign(this.#host.style, { position: "absolute", inset: "0", overflow: "hidden" });
    container.append(this.#host);
    this.#placement = new LayerPlacement(this.#host);
    this.#cards = new CardOverlay(this.#host);
    this.#endFade = this.#newEndFade();
    this.#resizeObserver = new ResizeObserver(onResize);
    this.#resizeObserver.observe(this.#host);
  }

  render(frame: RenderFrame<BrowserPicture>): void {
    const layers =
      frame.kind === "slide"
        ? [{ layer: frame.slide, opacity: OPAQUE }]
        : [
            { layer: frame.from, opacity: OPAQUE },
            { layer: frame.to, opacity: frame.progress },
          ];
    const viewport = { width: this.#host.clientWidth, height: this.#host.clientHeight };
    this.#sweep(layers.map(({ layer }) => layer));
    const placed = layers.map(({ layer, opacity }) => this.#placeLayer(layer, opacity, viewport));
    for (const { layer, opacity, anchor } of placed) {
      this.#placeCardAndCaption(layer, anchor, opacity, viewport);
      if (layer.kind === "picture") {
        this.#videos.place(layer.picture.element, layer.live);
      }
    }
    this.#placeEndFade(frame.endFade);
  }

  setCaptionInset(cssPixels: number): void {
    this.#captionInsetCssPixels = cssPixels;
  }

  /** Nothing to prepare: the browser draws the decoded picture element. */
  prepare(): void {
    return;
  }

  forget(picture: BrowserPicture): void {
    picture.element.remove();
    this.#captions.get(picture.element)?.remove();
    this.#captions.delete(picture.element);
    this.#placement.forget(picture.element);
    this.#videos.forget(picture.element);
  }

  dispose(): void {
    this.#resizeObserver.disconnect();
    this.#host.remove();
  }

  #placeLayer(layer: SlideLayer<BrowserPicture>, opacity: number, viewport: Size): PlacedLayer {
    if (layer.kind === "ground") {
      const anchor = this.#cards.placeGround(layer.ground, layer.card.card, opacity);
      return { layer, opacity, anchor };
    }
    const layout = slideLayout(layer, viewport);
    const anchor = this.#placement.place(layer, opacity, layout, viewport);
    return { layer, opacity, anchor };
  }

  /** The veil, the caption and the card right after `anchor`, in that screen order. */
  #placeCardAndCaption(
    layer: SlideLayer<BrowserPicture>,
    anchor: HTMLElement,
    opacity: number,
    viewport: Size,
  ): void {
    const veil = this.#veilFor(anchor, layer);
    const captionOpacity = layer.kind === "picture" ? (layer.captionOpacity ?? CAPTION_OPAQUE) : 0;
    const caption = this.#captionFor(layer, opacity * captionOpacity, viewport);
    const card =
      layer.card === undefined ? undefined : this.#cards.placeText(layer.card, opacity, viewport);
    anchor.after(
      ...[veil, caption, card].filter((node): node is HTMLElement => node !== undefined),
    );
  }

  #veilFor(anchor: HTMLElement, layer: SlideLayer<BrowserPicture>): HTMLElement | undefined {
    if (layer.kind !== "picture") {
      return undefined;
    }
    if (layer.card === undefined) {
      anchor.style.filter = "";
      return undefined;
    }
    return this.#cards.placeVeil(anchor, layer, layer.card.card);
  }

  /** Drops every picture, wrapper, backdrop, caption, ground, veil and card not drawn this frame. */
  #sweep(layers: readonly SlideLayer<BrowserPicture>[]): void {
    const pictureLayers = layers.filter(
      (layer): layer is PictureSlideLayer<BrowserPicture> => layer.kind === "picture",
    );
    const shown = new Set(
      pictureLayers.flatMap((layer) =>
        layer.partner === undefined
          ? [layer.picture.element]
          : [layer.picture.element, layer.partner.picture.element],
      ),
    );
    const blurredFillFronts = new Set(
      pictureLayers
        .filter((layer) => slideLayout(layer, this.#viewport()).kind === "blurred-fill")
        .map((layer) => layer.picture.element),
    );
    const shownCaptions = new Set(
      pictureLayers.flatMap((layer) =>
        layer.caption === undefined ? [] : [this.#captions.get(layer.picture.element)],
      ),
    );
    const shownCards = new Set<Card>(
      layers.flatMap((layer) => (layer.card === undefined ? [] : [layer.card.card])),
    );
    for (const child of [...this.#host.children]) {
      if (
        this.#placement.isExtra(child) ||
        this.#cards.isExtra(child) ||
        this.#videos.owns(child) ||
        child === this.#endFade
      ) {
        continue;
      }
      const kept =
        child instanceof HTMLImageElement
          ? shown.has(child)
          : shownCaptions.has(child as HTMLElement);
      if (!kept) {
        child.remove();
      }
    }
    this.#videos.sweep(shown);
    this.#placement.sweep(shown, blurredFillFronts);
    this.#cards.sweep(shownCards);
  }

  #viewport(): Size {
    return { width: this.#host.clientWidth, height: this.#host.clientHeight };
  }

  #captionFor(
    layer: SlideLayer<BrowserPicture>,
    opacity: number,
    viewport: Size,
  ): HTMLElement | undefined {
    if (layer.kind !== "picture" || layer.caption === undefined) {
      return undefined;
    }
    const band = this.#captionElement(layer.picture.element);
    const text = band.firstElementChild as HTMLElement;
    const styles = captionStyles(viewport, this.#captionInsetCssPixels);
    Object.assign(band.style, styles.band, { opacity: String(opacity) });
    Object.assign(text.style, styles.text);
    if (text.textContent !== layer.caption) {
      text.textContent = layer.caption;
    }
    return band;
  }

  #captionElement(picture: HTMLImageElement): HTMLElement {
    const existing = this.#captions.get(picture);
    if (existing !== undefined) {
      return existing;
    }
    const band = document.createElement("div");
    band.setAttribute(CAPTION_ATTRIBUTE, "");
    band.append(document.createElement("span"));
    this.#captions.set(picture, band);
    return band;
  }

  #placeEndFade(amount: number): void {
    Object.assign(this.#endFade.style, { opacity: String(amount) });
    this.#host.append(this.#endFade);
  }

  #newEndFade(): HTMLElement {
    const element = document.createElement("div");
    element.setAttribute(END_FADE_ATTRIBUTE, "");
    Object.assign(element.style, {
      position: "absolute",
      inset: "0",
      backgroundColor: "#000000",
      pointerEvents: "none",
      opacity: "0",
    });
    this.#host.append(element);
    return element;
  }
}
