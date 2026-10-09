import type { BrowserPicture } from "../browser/picture-loader";
import { captionStyles } from "../caption-style";
import { cropAt, type Size } from "../ken-burns";
import type { RenderFrame, SlideLayer, SlideRenderer } from "../ports";
import { layerTransform } from "./layer-transform";

const OPAQUE = 1;

/** Marks a caption element, the band right after its slide's picture. */
const CAPTION_ATTRIBUTE = "data-caption";

/**
 * The fallback without WebGL2: each slide is its picture element, framed by a CSS transform, and
 * its caption element right after it, outside that transform. Every transition effect becomes a
 * crossfade.
 */
export class DomRenderer implements SlideRenderer<BrowserPicture> {
  readonly #host: HTMLElement;
  readonly #resizeObserver: ResizeObserver;
  readonly #captions = new Map<HTMLImageElement, HTMLElement>();
  #captionInsetCssPixels = 0;

  constructor(container: HTMLElement, onResize: () => void) {
    this.#host = document.createElement("div");
    Object.assign(this.#host.style, { position: "absolute", inset: "0", overflow: "hidden" });
    container.append(this.#host);
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
    const shown = new Set(layers.map(({ layer }) => layer.picture.element));
    const shownCaptions = new Set(
      layers.flatMap(({ layer }) =>
        layer.caption === undefined ? [] : [this.#captions.get(layer.picture.element)],
      ),
    );
    for (const child of [...this.#host.children]) {
      const kept =
        child instanceof HTMLImageElement
          ? shown.has(child)
          : shownCaptions.has(child as HTMLElement);
      if (!kept) {
        child.remove();
      }
    }
    const viewport = { width: this.#host.clientWidth, height: this.#host.clientHeight };
    for (const { layer, opacity } of layers) {
      this.#place(layer, opacity, viewport);
      this.#placeCaption(layer, opacity, viewport);
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
  }

  dispose(): void {
    this.#resizeObserver.disconnect();
    this.#host.remove();
  }

  /** A new layer is appended, so the incoming slide lies on top of the outgoing one. */
  #place({ picture, motion }: SlideLayer<BrowserPicture>, opacity: number, viewport: Size): void {
    const crop = cropAt(motion, picture, viewport);
    Object.assign(picture.element.style, {
      position: "absolute",
      left: "0",
      top: "0",
      width: `${picture.width}px`,
      height: `${picture.height}px`,
      maxWidth: "none",
      transformOrigin: "0 0",
      transform: layerTransform(crop, picture, viewport),
      opacity: String(opacity),
    });
    if (picture.element.parentElement !== this.#host) {
      this.#host.append(picture.element);
    }
  }

  #placeCaption(
    { picture, caption }: SlideLayer<BrowserPicture>,
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
    if (band.previousElementSibling !== picture.element) {
      picture.element.after(band);
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
