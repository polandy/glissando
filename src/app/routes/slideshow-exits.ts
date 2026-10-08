import { SlideshowNotFoundError, type LibraryStore } from "../../library/stored-slideshow";
import type { Navigator } from "../navigation/navigator";
import type { Toaster } from "../toast/toaster";

/**
 * Deletes the shown slideshow. Its editor closes first, so no undo toast can store the
 * slideshow again while it is deleted. One deleted meanwhile, e.g. in another tab, is gone
 * either way and counts as deleted.
 */
export async function deleteShownSlideshow(
  store: Pick<LibraryStore, "deleteSlideshow">,
  slideshowId: string,
  editor: { dispose(): void } | null,
): Promise<void> {
  editor?.dispose();
  try {
    await store.deleteSlideshow(slideshowId);
  } catch (error) {
    if (!(error instanceof SlideshowNotFoundError)) {
      throw error;
    }
  }
}

/** Leaves the slideshow screen for the library, then says why in a toast shown there. */
export function leaveWithToast(
  ports: { readonly navigator: Pick<Navigator, "back">; readonly toaster: Pick<Toaster, "show"> },
  text: string,
): void {
  ports.navigator.back();
  ports.toaster.show({ text, tone: "info" });
}
