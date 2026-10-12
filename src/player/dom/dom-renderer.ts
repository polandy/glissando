import type { BrowserPicture } from "../browser/picture-loader";
import { captionStyles } from "../caption-style";
import type { Size } from "../ken-burns";
import type { RenderFrame, SlideLayer, SlideRenderer } from "../ports";
import { slideLayout, type SlideLayout } from "../slide-layout";
import { LayerPlacement } from "./dom-layer-placement";

const OPAQUE = 1;

/** Marks a caption element, the band right after its slide's picture or pair/blurred-fill node. */
const CAPTION_ATTRIBUTE = "data-caption";

/**
 * The fallback without WebGL2: each slide is its picture element (or, paired or blurred-filled,
 * a few, see `dom-layer-placement.ts`), framed by a CSS transform, and its caption element right
 * after it, outside that transform. Every transition effect becomes a crossfade (ADR-0028).
 */
export class DomRenderer implements SlideRenderer<BrowserPicture> {
  readonly #host: HTMLElement;
  readonly #resizeObserver: ResizeObserver;
  readonly #captions = new Map<HTMLImageElement, HTMLElement>();
  readonly #placement: LayerPlacement;
  #captionInsetCssPixels = 0;

  constructor(container: HTMLElement, onResize: () => void) {
    this.#host = document.createElement("div");
    Object.assign(this.#host.style, { position: "absolute", inset: "0", overflow: "hidden" });
    container.append(this.#host);
    this.#placement = new LayerPlacement(this.#host);
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
    const placed = layers.map(({ layer, opacity }) => ({
      layer,
      opacity,
      layout: slideLayout(layer, viewport),
    }));
    this.#sweep(placed);
    for (const { layer, opacity, layout } of placed) {
      const anchor = this.#placement.place(layer, opacity, layout, viewport);
      this.#placeCaption(layer, anchor, opacity, viewport);
    }
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
  }

  dispose(): void {
    this.#resizeObserver.disconnect();
    this.#host.remove();
  }

  /** Drops every picture, wrapper, backdrop and caption not drawn by `placed`'s layers this frame. */
  #sweep(
    placed: { readonly layer: SlideLayer<BrowserPicture>; readonly layout: SlideLayout }[],
  ): void {
    const shown = new Set(
      placed.flatMap(({ layer }) =>
        layer.partner === undefined
          ? [layer.picture.element]
          : [layer.picture.element, layer.partner.picture.element],
      ),
    );
    const blurredFillFronts = new Set(
      placed
        .filter(({ layout }) => layout.kind === "blurred-fill")
        .map(({ layer }) => layer.picture.element),
    );
    const shownCaptions = new Set(
      placed.flatMap(({ layer }) =>
        layer.caption === undefined ? [] : [this.#captions.get(layer.picture.element)],
      ),
    );
    for (const child of [...this.#host.children]) {
      if (this.#placement.isExtra(child)) {
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
    this.#placement.sweep(shown, blurredFillFronts);
  }

  #placeCaption(
    { picture, caption }: SlideLayer<BrowserPicture>,
    anchor: HTMLElement,
    opacity: number,
    viewport: Size,
  ): void {
    if (caption === undefined) {
      this.#captions.get(picture.element)?.remove();
      return;
    }
    const band = this.#captionElement(picture.element);
    const text = band.firstElementChild as HTMLElement;
    const styles = captionStyles(viewport, this.#captionInsetCssPixels);
    Object.assign(band.style, styles.band, { opacity: String(opacity) });
    Object.assign(text.style, styles.text);
    if (text.textContent !== caption) {
      text.textContent = caption;
    }
    if (band.previousElementSibling !== anchor) {
      anchor.after(band);
    }
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
}
