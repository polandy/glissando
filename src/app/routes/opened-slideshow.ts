import type { LibraryStore } from "../../library/library-store";
import { findSlideshowHome, type RouteStore } from "./slideshow-home";
import type { SlideshowHome } from "./slideshow-storage";

/** A slideshow opened by id, with the store of where it lives. */
export interface OpenedSlideshow {
  readonly home: SlideshowHome;
  readonly store: RouteStore;
}

/**
 * Opens a slideshow by id for its route. A failed lookup is reported and leaves to the parent
 * screen, so the user is never left on a blank one.
 */
export function openedSlideshowOf(ports: {
  readonly device: RouteStore & Pick<LibraryStore, "getSlideshow">;
  readonly server: RouteStore;
  readonly reportError: (error: unknown) => void;
  readonly leave: () => void;
}): (slideshowId: string) => Promise<OpenedSlideshow> {
  return async (slideshowId) => {
    try {
      const home = await findSlideshowHome(slideshowId, ports.device);
      return { home, store: home === "device" ? ports.device : ports.server };
    } catch (error) {
      ports.reportError(error);
      ports.leave();
      throw error;
    }
  };
}
