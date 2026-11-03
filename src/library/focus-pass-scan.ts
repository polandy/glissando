import type { FocusPassQueue } from "./focus-pass-queue";
import { isOutdated, type FocusPassPorts } from "./focus-pass-types";
import type { StoredFocus } from "./picture-focus";

/**
 * Queues every picture with no current focus that the pass has not taken up yet; a slideshow
 * gone by the time its own focus is read (`isGone`) is skipped, the scan carrying on with the
 * rest.
 */
export async function scanForOutdatedFocus(
  ports: FocusPassPorts,
  queue: FocusPassQueue,
): Promise<void> {
  const slideshows = await ports.store.listSlideshows();
  for (const slideshow of slideshows) {
    const pictureIds = slideshow.pictures.map((p) => p.id);
    let stored: ReadonlyMap<string, StoredFocus>;
    try {
      stored = await ports.store.pictureFocus(pictureIds);
    } catch (error) {
      if (ports.isGone?.(error) === true) {
        continue;
      }
      throw error;
    }
    for (const picture of slideshow.pictures) {
      if (queue.takenUpAlready(picture.id) || !isOutdated(stored.get(picture.id))) {
        continue;
      }
      queue.enqueueBackground(slideshow.id, picture.id, stored.has(picture.id));
    }
  }
}

/** Takes up pictures asked for by `lookAgain`, regardless of their record, at the queue's front. */
export async function takeUpForcedPictures(
  ports: FocusPassPorts,
  queue: FocusPassQueue,
  pictureIds: readonly string[],
): Promise<void> {
  const candidates = pictureIds.filter((id) => !queue.isInFlight(id));
  if (candidates.length === 0) {
    return;
  }
  const [slideshows, stored] = await Promise.all([
    ports.store.listSlideshows(),
    ports.store.pictureFocus(candidates),
  ]);
  const memberOf = new Map<string, string[]>();
  for (const slideshow of slideshows) {
    for (const picture of slideshow.pictures) {
      memberOf.set(picture.id, [...(memberOf.get(picture.id) ?? []), slideshow.id]);
    }
  }
  for (const id of candidates) {
    for (const slideshowId of memberOf.get(id) ?? []) {
      queue.addToProgress(slideshowId, id, stored.has(id));
    }
  }
  queue.bringToFront(candidates);
}
