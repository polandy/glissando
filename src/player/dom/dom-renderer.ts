import type { BrowserPicture } from "../browser/picture-loader";
import { cropRect } from "../ken-burns";
import type { RenderFrame, SlideLayer, SlideRenderer } from "../ports";
import { layerTransform } from "./layer-transform";

const OPAQUE = 1;

/**
 * The fallback without WebGL2: each slide is its picture element, framed by a CSS transform.
 * Every transition effect becomes a crossfade.
 */
export class DomRenderer implements SlideRenderer<BrowserPicture> {
  readonly #host: HTMLElement;
  readonly #resizeObserver: ResizeObserver;

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
    for (const child of [...this.#host.children]) {
      if (!(child instanceof HTMLImageElement) || !shown.has(child)) {
        child.remove();
      }
    }
    for (const { layer, opacity } of layers) {
      this.#place(layer, opacity);
    }
  }

  forget(picture: BrowserPicture): void {
    picture.element.remove();
  }

  dispose(): void {
    this.#resizeObserver.disconnect();
    this.#host.remove();
  }

  /** A new layer is appended, so the incoming slide lies on top of the outgoing one. */
  #place({ picture, framing }: SlideLayer<BrowserPicture>, opacity: number): void {
    const viewport = { width: this.#host.clientWidth, height: this.#host.clientHeight };
    const crop = cropRect(framing, picture, viewport);
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
}
