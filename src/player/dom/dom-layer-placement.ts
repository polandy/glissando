import type { BrowserPicture } from "../browser/picture-loader";
import type { Rect, Size } from "../ken-burns";
import type { SlideLayer } from "../ports";
import { BACKDROP_BRIGHTNESS, type SlideLayout } from "../slide-layout";
import { layerTransform, toPixelRect } from "./layer-transform";

/** Strong enough to read as "blurred", matching the WebGL renderer's coarse mip lookup. */
const BACKDROP_BLUR_PIXELS = 40;

/** Marks a layout's extra nodes, so the render loop's generic sweep leaves them alone. */
const WRAPPER_ATTRIBUTE = "data-layer-wrapper";
const BACKDROP_ATTRIBUTE = "data-backdrop";

/**
 * Places a layer's picture(s) in `host` per its `SlideLayout` (ADR-0028): a single picture
 * covering the viewport (unchanged from before pairs and the blurred fill existed), a pair's two
 * halves each clipped to their own wrapper, or a blurred fill's front picture over a second,
 * blurred and darkened copy of itself.
 */
export class LayerPlacement {
  readonly #host: HTMLElement;
  /** A pair's or a blurred fill's front picture, clipped to its share of the screen. */
  readonly #wrappers = new Map<HTMLImageElement, HTMLElement>();
  /** A blurred fill's backdrop: a clone of the front picture, keyed by the front's element. */
  readonly #backdrops = new Map<HTMLImageElement, HTMLImageElement>();

  constructor(host: HTMLElement) {
    this.#host = host;
  }

  /** True for a node this class placed itself, which the render loop's sweep must not remove. */
  isExtra(node: ChildNode): boolean {
    return (
      node instanceof HTMLElement &&
      (node.hasAttribute(WRAPPER_ATTRIBUTE) || node.hasAttribute(BACKDROP_ATTRIBUTE))
    );
  }

  /** Places the layer's picture(s); returns the top-level node its caption, if any, follows. */
  place(
    layer: SlideLayer<BrowserPicture>,
    opacity: number,
    layout: SlideLayout,
    viewport: Size,
  ): HTMLElement {
    if (layout.kind === "cover") {
      this.forget(layer.picture.element);
      return this.#placeCover(layer.picture, layout.crop, opacity, viewport);
    }
    if (layout.kind === "blurred-fill") {
      this.#placeBackdrop(layer.picture, layout.backdropCrop, opacity, viewport);
      return this.#placeWrapped(
        layer.picture,
        layout.frontCrop,
        layout.frontRect,
        opacity,
        viewport,
      );
    }
    this.#removeBackdrop(layer.picture.element);
    const first = this.#placeWrapped(
      layer.picture,
      layout.firstCrop,
      layout.firstRect,
      opacity,
      viewport,
    );
    if (layer.partner !== undefined) {
      this.#placeWrapped(
        layer.partner.picture,
        layout.secondCrop,
        layout.secondRect,
        opacity,
        viewport,
      );
    }
    return first;
  }

  /** Drops every extra node whose picture is not in `shown`, or a blurred fill's that is not in `blurredFillFronts`. */
  sweep(
    shown: ReadonlySet<HTMLImageElement>,
    blurredFillFronts: ReadonlySet<HTMLImageElement>,
  ): void {
    for (const element of [...this.#wrappers.keys()]) {
      if (!shown.has(element)) {
        this.#removeWrapper(element);
      }
    }
    for (const element of [...this.#backdrops.keys()]) {
      if (!blurredFillFronts.has(element)) {
        this.#removeBackdrop(element);
      }
    }
  }

  /** The picture will not be drawn again: drop any wrapper or backdrop held for it. */
  forget(element: HTMLImageElement): void {
    this.#removeWrapper(element);
    this.#removeBackdrop(element);
  }

  #placeCover(picture: BrowserPicture, crop: Rect, opacity: number, viewport: Size): HTMLElement {
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
    return picture.element;
  }

  /** The picture clipped to `rect`'s share of the screen: a pair's half, or a blurred fill's front. */
  #placeWrapped(
    picture: BrowserPicture,
    crop: Rect,
    rect: Rect,
    opacity: number,
    viewport: Size,
  ): HTMLElement {
    const pixelRect = toPixelRect(rect, viewport);
    const wrapper = this.#wrapperFor(picture.element);
    Object.assign(wrapper.style, {
      position: "absolute",
      left: `${pixelRect.left}px`,
      top: `${pixelRect.top}px`,
      width: `${pixelRect.width}px`,
      height: `${pixelRect.height}px`,
      overflow: "hidden",
      opacity: String(opacity),
    });
    if (wrapper.parentElement !== this.#host) {
      this.#host.append(wrapper);
    }
    Object.assign(picture.element.style, {
      position: "absolute",
      left: "0",
      top: "0",
      width: `${picture.width}px`,
      height: `${picture.height}px`,
      maxWidth: "none",
      transformOrigin: "0 0",
      transform: layerTransform(crop, picture, pixelRect),
      opacity: "1",
    });
    if (picture.element.parentElement !== wrapper) {
      wrapper.append(picture.element);
    }
    return wrapper;
  }

  /** The same picture as the front, static, blurred and darkened, covering the whole screen. */
  #placeBackdrop(front: BrowserPicture, crop: Rect, opacity: number, viewport: Size): void {
    const backdrop = this.#backdropFor(front);
    Object.assign(backdrop.style, {
      position: "absolute",
      left: "0",
      top: "0",
      width: `${front.width}px`,
      height: `${front.height}px`,
      maxWidth: "none",
      transformOrigin: "0 0",
      transform: layerTransform(crop, front, viewport),
      filter: `blur(${BACKDROP_BLUR_PIXELS}px) brightness(${BACKDROP_BRIGHTNESS})`,
      opacity: String(opacity),
    });
    if (backdrop.parentElement !== this.#host) {
      this.#host.append(backdrop);
    }
  }

  #wrapperFor(element: HTMLImageElement): HTMLElement {
    const existing = this.#wrappers.get(element);
    if (existing !== undefined) {
      return existing;
    }
    const wrapper = document.createElement("div");
    wrapper.setAttribute(WRAPPER_ATTRIBUTE, "");
    this.#wrappers.set(element, wrapper);
    return wrapper;
  }

  /** A clone, not the loaded element itself: the front and the backdrop show at once. */
  #backdropFor(front: BrowserPicture): HTMLImageElement {
    const existing = this.#backdrops.get(front.element);
    if (existing !== undefined) {
      return existing;
    }
    const backdrop = front.element.cloneNode(false) as HTMLImageElement;
    backdrop.removeAttribute("style");
    backdrop.setAttribute(BACKDROP_ATTRIBUTE, "");
    this.#backdrops.set(front.element, backdrop);
    return backdrop;
  }

  #removeWrapper(element: HTMLImageElement): void {
    this.#wrappers.get(element)?.remove();
    this.#wrappers.delete(element);
  }

  #removeBackdrop(element: HTMLImageElement): void {
    this.#backdrops.get(element)?.remove();
    this.#backdrops.delete(element);
  }
}
