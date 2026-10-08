import { CLAIM_SPARED_FOR_MS, type MediaClaim, type StoredSlideshow } from "./stored-slideshow";

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

/** The media ids `deleted` uses that none of the `remaining` slideshows uses. */
export function mediaOnlyIn(
  deleted: StoredSlideshow,
  remaining: readonly StoredSlideshow[],
): string[] {
  const kept = referencedMediaIds(remaining);
  return [...referencedMediaIds([deleted])].filter((id) => !kept.has(id));
}

/** `existing` with `mediaId` claimed for `claimId`; a new claim starts at `startedAt`. */
export function withClaimedMedia(
  existing: MediaClaim | undefined,
  claimId: string,
  startedAt: Date,
  mediaId: string,
): MediaClaim {
  const record = existing ?? { id: claimId, startedAt: startedAt.toISOString(), mediaIds: [] };
  return { ...record, mediaIds: [...record.mediaIds, mediaId] };
}

/** Which media the claims spare at `now`, and which claims are stale. */
export function claimsAt(
  imports: readonly MediaClaim[],
  now: Date,
): { readonly sparedMediaIds: Set<string>; readonly staleClaimIds: string[] } {
  const sparedMediaIds = new Set<string>();
  const staleClaimIds: string[] = [];
  for (const record of imports) {
    if (now.getTime() - Date.parse(record.startedAt) < CLAIM_SPARED_FOR_MS) {
      record.mediaIds.forEach((id) => sparedMediaIds.add(id));
    } else {
      staleClaimIds.push(record.id);
    }
  }
  return { sparedMediaIds, staleClaimIds };
}
