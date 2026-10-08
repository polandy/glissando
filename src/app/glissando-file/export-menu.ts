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
