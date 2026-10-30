import { lookFilterValues } from "../looks/look-filter";
import {
  GRADED_SLIDESHOW_LOOKS,
  DEFAULT_SLIDESHOW_LOOK,
  type SlideshowLook,
} from "../looks/slideshow-look";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const FILTER_ID_PREFIX = "glissando-look";

/**
 * One inline SVG `<filter>` per graded look (ADR-0044, `dev-docs/player/LOOKS.md` § Renderers),
 * built once from `lookFilterValues` and referenced by a picture or video element's CSS
 * `filter: url(#id)`. Present in the DOM for that lookup only, never shown itself.
 */
export class DomLookFilters {
  readonly #svg: SVGSVGElement;
  readonly #ids: ReadonlyMap<SlideshowLook, string>;

  constructor(host: HTMLElement) {
    const instance = crypto.randomUUID();
    this.#svg = document.createElementNS(SVG_NAMESPACE, "svg");
    Object.assign(this.#svg.style, { position: "absolute", width: "0", height: "0" });
    this.#svg.setAttribute("aria-hidden", "true");
    const ids = new Map<SlideshowLook, string>();
    for (const look of GRADED_SLIDESHOW_LOOKS) {
      const id = `${FILTER_ID_PREFIX}-${look}-${instance}`;
      this.#svg.append(buildFilter(id, look));
      ids.set(look, id);
    }
    this.#ids = ids;
    host.append(this.#svg);
  }

  /** The CSS filter fragment `look` needs: `url(#id)`, or "" for "none" (no filter at all). */
  filterUrl(look: SlideshowLook): string {
    if (look === DEFAULT_SLIDESHOW_LOOK) {
      return "";
    }
    return `url(#${this.#ids.get(look)})`;
  }

  dispose(): void {
    this.#svg.remove();
  }
}

/** `id`'s `<filter>`: `feColorMatrix` then `feComponentTransfer`, matching `gradeColour` exactly
 * (LOOKS.md § The grade). `look` is always graded here — `GRADED_SLIDESHOW_LOOKS` excludes
 * "none", the only look `lookFilterValues` returns null for. */
function buildFilter(id: string, look: SlideshowLook): SVGFilterElement {
  const values = lookFilterValues(look);
  if (values === null) {
    throw new Error(`unreachable: "${look}" is graded, not "none"`);
  }
  const filter = document.createElementNS(SVG_NAMESPACE, "filter");
  filter.setAttribute("id", id);
  filter.setAttribute("color-interpolation-filters", "sRGB");
  const colorMatrix = document.createElementNS(SVG_NAMESPACE, "feColorMatrix");
  colorMatrix.setAttribute("type", "matrix");
  colorMatrix.setAttribute("values", values.colorMatrixValues);
  filter.append(colorMatrix);
  const transfer = document.createElementNS(SVG_NAMESPACE, "feComponentTransfer");
  for (const [tag, tableValues] of [
    ["feFuncR", values.tableValues.r],
    ["feFuncG", values.tableValues.g],
    ["feFuncB", values.tableValues.b],
  ] as const) {
    const func = document.createElementNS(SVG_NAMESPACE, tag);
    func.setAttribute("type", "table");
    func.setAttribute("tableValues", tableValues);
    transfer.append(func);
  }
  filter.append(transfer);
  return filter;
}
