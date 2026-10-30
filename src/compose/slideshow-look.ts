import { DEFAULT_SLIDESHOW_LOOK, type SlideshowLook } from "../player/looks/slideshow-look";
import type { StoredSlideshow } from "../library/stored-slideshow";

/** The slideshow's colour grade: the stored one, else None (ADR-0044). */
export function slideshowLook(slideshow: StoredSlideshow): SlideshowLook {
  return slideshow.look ?? DEFAULT_SLIDESHOW_LOOK;
}
