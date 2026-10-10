import {
  SlideshowNotFoundError,
  type LibraryStore,
  type SlideshowStore,
} from "../../library/stored-slideshow";
import type { SlideshowHome } from "./slideshow-storage";

/** The store the slideshow route reads and edits through, of either home. */
export type RouteStore = SlideshowStore &
  Pick<LibraryStore, "claimMedia" | "releaseClaim" | "mediaBytes">;

/**
 * Where a slideshow opened by id lives: the device is asked first, as it answers offline too; a
 * slideshow it does not know is taken for one on the server, whose store tells if it is unknown.
 */
export async function findSlideshowHome(
  slideshowId: string,
  device: Pick<LibraryStore, "getSlideshow">,
): Promise<SlideshowHome> {
  try {
    await device.getSlideshow(slideshowId);
    return "device";
  } catch (error) {
    if (error instanceof SlideshowNotFoundError) return "server";
    throw error;
  }
}

/**
 * The server store with the device-only slices the route needs: the server keeps no media of its
 * own to spare from clean-up, and a server slideshow's size is not known before downloading.
 */
export function serverRouteStore(server: SlideshowStore): RouteStore {
  return {
    listSlideshows: () => server.listSlideshows(),
    getSlideshow: (id) => server.getSlideshow(id),
    updateSlideshow: (slideshow) => server.updateSlideshow(slideshow),
    updateSlideshowWith: (id, edit) => server.updateSlideshowWith(id, edit),
    deleteSlideshow: (id) => server.deleteSlideshow(id),
    pictureBlob: (id) => server.pictureBlob(id),
    thumbnailBlob: (id) => server.thumbnailBlob(id),
    musicBlob: (id) => server.musicBlob(id),
    pictureFocus: (ids) => server.pictureFocus(ids),
    putPictureFocus: (id, focus) => server.putPictureFocus(id, focus),
    claimMedia: () => Promise.resolve(),
    releaseClaim: () => Promise.resolve(),
    mediaBytes: () =>
      Promise.reject(new Error("a server slideshow's size is not measured before downloading")),
  };
}
