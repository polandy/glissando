import type { SlideshowLook } from "../../../player";

/** The SVG filter id for `look` under `prefix` (lets several `LookFilterDefs` instances coexist
 * in one document without id collisions); null for "none", which needs no filter. */
export function lookFilterId(prefix: string, look: SlideshowLook): string | null {
  return look === "none" ? null : `look-filter-${prefix}-${look}`;
}

/** The CSS `filter` value for `look` under `prefix`; "" for "none" (no grading). */
export function lookFilterUrl(prefix: string, look: SlideshowLook): string {
  const id = lookFilterId(prefix, look);
  return id === null ? "" : `url(#${id})`;
}
