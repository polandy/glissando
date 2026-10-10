import { safeFileStem } from "../glissando-file/export-slideshow";
import { fitWithin, type Bound, type Size } from "../import/downscale";
import type { PlayerBundle } from "./ports";

export type PageSizeId = "small" | "sharp" | "4k";

export interface PageSize {
  readonly id: PageSizeId;
  /** Every picture is fitted within it, never scaled up. */
  readonly bound: Bound;
}

/** The sizes a web page export offers, smallest first (dev-docs/HTML_EXPORT.md, "Sizes"). */
export const PAGE_SIZES: readonly PageSize[] = [
  { id: "small", bound: { longEdge: 1280, shortEdge: 720 } },
  { id: "sharp", bound: { longEdge: 1920, shortEdge: 1080 } },
  { id: "4k", bound: { longEdge: 3840, shortEdge: 2160 } },
];

export const DEFAULT_PAGE_SIZE: PageSizeId = "small";
/** The JPEG quality of a scaled picture (ADR-0017). */
export const PAGE_JPEG_QUALITY = 0.85;
export const PAGE_FILE_EXTENSION = ".html";
/** Base64 turns every 3 bytes into 4 characters. */
const BASE64_GROWTH = 4 / 3;

export function pageSizeById(id: PageSizeId): PageSize {
  const size = PAGE_SIZES.find((candidate) => candidate.id === id);
  if (size === undefined) {
    throw new Error(`unknown web page size "${id}"; use one of ${PAGE_SIZES.map((s) => s.id)}`);
  }
  return size;
}

/** How a stored picture goes into the page: its own bytes, or scaled down to `size`. */
export type PictureRendition =
  { readonly kind: "stored" } | { readonly kind: "scaled"; readonly size: Size };

export function pictureRendition(stored: Size, sizeId: PageSizeId): PictureRendition {
  const fitted = fitWithin(stored, pageSizeById(sizeId).bound);
  return fitted.width === stored.width && fitted.height === stored.height
    ? { kind: "stored" }
    : { kind: "scaled", size: fitted };
}

/** A stored picture's size and its byte count. */
export interface PictureWeight extends Size {
  readonly bytes: number;
}

export interface PageWeights {
  readonly pictures: readonly PictureWeight[];
  readonly musicBytes: number;
  /** The player bundle, font and markup (`playerBundleBytes`). */
  readonly pageBytes: number;
}

/**
 * The page's expected size in bytes: each picture's bytes in proportion to the pixels it keeps,
 * which ignores that JPEG compresses smaller pictures a little worse.
 */
export function estimatePageBytes(weights: PageWeights, sizeId: PageSizeId): number {
  const pictureBytes = weights.pictures.reduce((sum, picture) => {
    const rendition = pictureRendition(picture, sizeId);
    const share =
      rendition.kind === "stored"
        ? 1
        : (rendition.size.width * rendition.size.height) / (picture.width * picture.height);
    return sum + picture.bytes * share;
  }, 0);
  return (pictureBytes + weights.musicBytes + weights.pageBytes) * BASE64_GROWTH;
}

const utf8 = new TextEncoder();

/** The player bundle's share of the page, for `PageWeights.pageBytes`; the markup is negligible. */
export function playerBundleBytes(bundle: PlayerBundle): number {
  return [bundle.script, bundle.style, bundle.captionFontDataUrl].reduce(
    (sum, part) => sum + utf8.encode(part).length,
    0,
  );
}

/** "<title>.html", with the same character rule as `.glissando` files. */
export function pageFileName(title: string): string {
  return `${safeFileStem(title)}${PAGE_FILE_EXTENSION}`;
}
