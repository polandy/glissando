import type { StoredSlideshow } from "./stored-slideshow";

/** Orders slideshows by creation instant, newest first; equal instants by id for a stable list. */
export function newestFirst(slideshows: readonly StoredSlideshow[]): StoredSlideshow[] {
  return [...slideshows].sort(
    (a, b) =>
      Date.parse(b.createdAt) - Date.parse(a.createdAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

/** Every media id the given slideshows use. */
export function referencedMediaIds(slideshows: readonly StoredSlideshow[]): Set<string> {
  const ids = new Set<string>();
  for (const slideshow of slideshows) {
    for (const picture of slideshow.pictures) {
      ids.add(picture.id);
    }
    if (slideshow.music !== undefined) {
      ids.add(slideshow.music.id);
    }
  }
  return ids;
}
