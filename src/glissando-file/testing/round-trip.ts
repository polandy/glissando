import type { StoredSlideshow } from "../../library/stored-slideshow";
import type { MemoryLibraryStore } from "../../library/testing/memory-store";
import { checkGlissandoFile } from "../check-glissando-file";
import { exportSlideshow } from "../export-slideshow";
import { writeGlissandoFile } from "../write-glissando-file";
import { fakeMediaDecoders } from "./fake-media-decoders";
import { EXPORT_OPTIONS, MODIFIED_AT } from "./glissando-fixtures";

/** Exports `slideshow` from `store` and opens the file into the same store, as the app does. */
export async function roundTrip(
  slideshow: StoredSlideshow,
  store: MemoryLibraryStore,
): Promise<StoredSlideshow> {
  const exported = await exportSlideshow(slideshow, store, EXPORT_OPTIONS);
  const check = await checkGlissandoFile(exported, {
    freeBytes: () => Promise.resolve(null),
    mediaDecoders: fakeMediaDecoders(),
  });
  if (check.kind !== "ok") {
    throw new Error(`the export should pass the check, got ${JSON.stringify(check)}`);
  }
  let next = 0;
  const created = await writeGlissandoFile(
    check.contents,
    { store, newId: () => `copy-${++next}`, now: () => MODIFIED_AT, log: () => undefined },
    { existingTitles: [slideshow.title], signal: new AbortController().signal },
  );
  return store.getSlideshow(created.id);
}

/** The new id of each picture, clip and song of `copy`, mapped to the original's at its place. */
export function originalIds(copy: StoredSlideshow, original: StoredSlideshow): Map<string, string> {
  const ids = new Map<string, string>();
  const pair = (copyId: string | undefined, originalId: string | undefined): void => {
    if (copyId !== undefined && originalId !== undefined) {
      ids.set(copyId, originalId);
    }
  };
  copy.pictures.forEach((picture, index) => {
    const source = original.pictures[index];
    pair(picture.id, source?.id);
    pair(picture.video?.mediaId, source?.video?.mediaId);
  });
  copy.songs.forEach((song, index) => pair(song.id, original.songs[index]?.id));
  return ids;
}

/**
 * `copy` with its new ids swapped for the original's and the fields a copy must change (id,
 * title, creation time) taken from `original`, so it equals `original` when nothing was lost.
 */
export function asOriginal(copy: StoredSlideshow, original: StoredSlideshow): unknown {
  const ids = originalIds(copy, original);
  const swapped = JSON.parse(JSON.stringify(copy), (_key, value: unknown) =>
    typeof value === "string" ? (ids.get(value) ?? value) : value,
  ) as StoredSlideshow;
  return { ...swapped, id: original.id, title: original.title, createdAt: original.createdAt };
}
