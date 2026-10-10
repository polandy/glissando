import { SvelteSet } from "svelte/reactivity";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { PictureMissingFromImmichError } from "../../server-library/server-slideshow-store";
import { slideshowDetails } from "../library-views";
import { browserObjectUrls, ObjectUrls } from "../media/object-urls";
import type { SlideshowDetails } from "../screens/view-models";

/**
 * The slideshow screen's thumbnails, loaded once for every picture, so an undo brings back ones
 * already loaded. Pictures Immich answered 404 for are kept as missing: their tiles are dashed.
 */
export class ScreenThumbnails {
  /** Read reactively. */
  readonly missing = new SvelteSet<string>();
  readonly urls: ObjectUrls;

  constructor(load: (pictureId: string) => Promise<Blob>, onError: (error: unknown) => void) {
    this.urls = new ObjectUrls({
      ...browserObjectUrls,
      load,
      onError: (error) => {
        if (error instanceof PictureMissingFromImmichError) this.missing.add(error.pictureId);
        else onError(error);
      },
    });
  }

  /** The screen's view of `stored`, a missing picture's tile marked as such. */
  details(stored: StoredSlideshow): SlideshowDetails {
    const shown = slideshowDetails(stored, (id) => this.urls.get(id) ?? "");
    const pictures = shown.pictures.map((tile) =>
      this.missing.has(tile.id) ? { ...tile, missing: true as const } : tile,
    );
    return { ...shown, pictures };
  }

  missingCount(stored: StoredSlideshow): number {
    return stored.pictures.filter(({ id }) => this.missing.has(id)).length;
  }

  dispose(): void {
    this.urls.dispose();
  }
}
