import {
  IMPORT_SPARED_FOR_MS,
  type ImportInProgress,
  type StoredSlideshow,
} from "./stored-slideshow";

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

/** `imports` with `mediaId` claimed for `importId`; a new import starts at `startedAt`. */
export function withImportMedia(
  existing: ImportInProgress | undefined,
  importId: string,
  startedAt: Date,
  mediaId: string,
): ImportInProgress {
  const record = existing ?? { id: importId, startedAt: startedAt.toISOString(), mediaIds: [] };
  return { ...record, mediaIds: [...record.mediaIds, mediaId] };
}

/** Which media the imports in progress spare at `now`, and which imports are stale. */
export function importsAt(
  imports: readonly ImportInProgress[],
  now: Date,
): { readonly sparedMediaIds: Set<string>; readonly staleImportIds: string[] } {
  const sparedMediaIds = new Set<string>();
  const staleImportIds: string[] = [];
  for (const record of imports) {
    if (now.getTime() - Date.parse(record.startedAt) < IMPORT_SPARED_FOR_MS) {
      record.mediaIds.forEach((id) => sparedMediaIds.add(id));
    } else {
      staleImportIds.push(record.id);
    }
  }
  return { sparedMediaIds, staleImportIds };
}
