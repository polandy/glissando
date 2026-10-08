import type { StoredSlideshow } from "../../library/stored-slideshow";
import type { ExportProgress } from "./export-job";

/** The slideshow menu's Export item: free, this slideshow's export running, or another's. */
export type ExportMenuState =
  | { readonly kind: "idle"; readonly sizeBytes: number | null }
  | { readonly kind: "this"; readonly fraction: number }
  | { readonly kind: "other" };

export function exportMenuState(
  running: ExportProgress | null,
  slideshowId: string,
  sizeBytes: number | null,
): ExportMenuState {
  if (running === null) {
    return { kind: "idle", sizeBytes };
  }
  return running.slideshowId === slideshowId
    ? { kind: "this", fraction: running.fraction }
    : { kind: "other" };
}

/**
 * What the export's size depends on: the slideshow's media ids. The size is measured again only
 * when this changes, since measuring reads every media record.
 */
export function exportMediaKey(slideshow: StoredSlideshow): string {
  return JSON.stringify([slideshow.pictures.map((picture) => picture.id), slideshow.music?.id]);
}
