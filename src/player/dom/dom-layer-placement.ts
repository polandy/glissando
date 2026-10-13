import type { BrowserPicture } from "../browser/picture-loader";
import type { Rect, Size } from "../ken-burns";
import { BACKDROP_BLUR_RADIUS_SHARE } from "../backdrop-blur";
import type { SlideLayer } from "../ports";
import { BACKDROP_BRIGHTNESS, type SlideLayout } from "../slide-layout";
import { layerTransform, toPixelRect } from "./layer-transform";

/** A blurred fill's front, inside its group, which carries the layer's opacity. */
const OPAQUE = 1;

/** Marks a layout's extra nodes, so the render loop's generic sweep leaves them alone. */
const WRAPPER_ATTRIBUTE = "data-layer-wrapper";
const GROUP_ATTRIBUTE = "data-blurred-fill";
const BACKDROP_ATTRIBUTE = "data-backdrop";

/** A blurred fill's nodes: the group that fades as one, and the backdrop inside it. */
interface BlurredFill {
  readonly group: HTMLElement;
  readonly backdrop: HTMLImageElement;
}

/**
 * Places a layer's picture(s) in `host` per its `SlideLayout` (ADR-0028): a single picture
 * covering the viewport, a pair's two halves each clipped to their own wrapper, or a blurred
 * fill's front picture over a second, blurred and darkened copy of itself. The blurred fill's
 * backdrop and front share one group node carrying the layer's opacity, so in a crossfade the
 * layer blends as a whole, as in the WebGL renderer, and its backdrop never shows through its
 * half-transparent front.
 */
export class LayerPlacement {
  readonly #host: HTMLElement;
  /** A pair's or a blurred fill's front picture, clipped to its share of the screen. */
  readonly #wrappers = new Map<HTMLImageElement, HTMLElement>();
  /** A blurred fill's group and backdrop, keyed by the front picture's element. */
  readonly #fills = new Map<HTMLImageElement, BlurredFill>();

  constructor(host: HTMLElement) {
    this.#host = host;
  }

  /** True for a node this class placed itself, which the render loop's sweep must not remove. */
  isExtra(node: ChildNode): boolean {
    return (
      node instanceof HTMLElement &&
      (node.hasAttribute(WRAPPER_ATTRIBUTE) || node.hasAttribute(GROUP_ATTRIBUTE))
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
      const group = this.#placeBlurredFill(layer.picture, layout.backdropCrop, opacity, viewport);
      this.#placeWrapped(
        layer.picture,
        layout.frontCrop,
        layout.frontRect,
        OPAQUE,
        viewport,
        group,
      );
      return group;
    }
    this.#removeBlurredFill(layer.picture.element);
    const first = this.#placeWrapped(
      layer.picture,
      layout.firstCrop,
      layout.firstRect,
      opacity,
      viewport,
      this.#host,
    );
    if (layer.partner !== undefined) {
      this.#placeWrapped(
        layer.partner.picture,
        layout.secondCrop,
        layout.secondRect,
        opacity,
        viewport,
        this.#host,
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
    for (const element of [...this.#fills.keys()]) {
      if (!blurredFillFronts.has(element)) {
        this.#removeBlurredFill(element);
      }
    }
  }

  /** The picture will not be drawn again: drop any wrapper or backdrop held for it. */
  forget(element: HTMLImageElement): void {
    this.#removeWrapper(element);
    this.#removeBlurredFill(element);
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

  /**
   * The picture clipped to `rect`'s share of the screen, in `parent`: a pair's half in the host,
   * or a blurred fill's front in its group.
   */
  #placeWrapped(
    picture: BrowserPicture,
    crop: Rect,
    rect: Rect,
    opacity: number,
    viewport: Size,
    parent: HTMLElement,
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
    if (wrapper.parentElement !== parent) {
      parent.append(wrapper);
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

  /**
   * The blurred fill's group, carrying the layer's opacity, with the backdrop in it: the same
   * picture as the front, static, blurred and darkened, covering the whole screen. The blur is
   * set in the backdrop's own pixels, the picture's, which its transform scales with it, so it
   * is the same share of the picture as the WebGL renderer's.
   */
  #placeBlurredFill(
    front: BrowserPicture,
    crop: Rect,
    opacity: number,
    viewport: Size,
  ): HTMLElement {
    const { group, backdrop } = this.#blurredFillFor(front);
    Object.assign(group.style, { position: "absolute", inset: "0", opacity: String(opacity) });
    if (group.parentElement !== this.#host) {
      this.#host.append(group);
    }
    const blurRadius = BACKDROP_BLUR_RADIUS_SHARE * Math.max(front.width, front.height);
    Object.assign(backdrop.style, {
      position: "absolute",
      left: "0",
      top: "0",
      width: `${front.width}px`,
      height: `${front.height}px`,
      maxWidth: "none",
      transformOrigin: "0 0",
      transform: layerTransform(crop, front, viewport),
      filter: `blur(${blurRadius}px) brightness(${BACKDROP_BRIGHTNESS})`,
    });
    return group;
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

  /** The backdrop is a clone, not the loaded element itself: the front and it show at once. */
  #blurredFillFor(front: BrowserPicture): BlurredFill {
    const existing = this.#fills.get(front.element);
    if (existing !== undefined) {
      return existing;
    }
    const group = document.createElement("div");
    group.setAttribute(GROUP_ATTRIBUTE, "");
    const backdrop = front.element.cloneNode(false) as HTMLImageElement;
    backdrop.removeAttribute("style");
    backdrop.setAttribute(BACKDROP_ATTRIBUTE, "");
    group.append(backdrop);
    const fill = { group, backdrop };
    this.#fills.set(front.element, fill);
    return fill;
  }

  #removeWrapper(element: HTMLImageElement): void {
    this.#wrappers.get(element)?.remove();
    this.#wrappers.delete(element);
  }

  #removeBlurredFill(element: HTMLImageElement): void {
    this.#fills.get(element)?.group.remove();
    this.#fills.delete(element);
  }
}
