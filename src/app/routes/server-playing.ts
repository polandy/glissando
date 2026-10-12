import type { StoredSlideshow } from "../../library/stored-slideshow";
import { PictureMissingFromImmichError } from "../../server-library/server-slideshow-store";
import type { PlayerFailure } from "../player/player-failure";
import type { SlideshowHome } from "./slideshow-storage";

/** The slideshow as played: the pictures Immich no longer has are skipped. */
export function playedPictures(
  stored: StoredSlideshow,
  missing: ReadonlySet<string>,
): StoredSlideshow {
  if (!stored.pictures.some(({ id }) => missing.has(id))) return stored;
  return { ...stored, pictures: stored.pictures.filter(({ id }) => !missing.has(id)) };
}

/**
 * Slides loaded beyond the last one on screen: a server picture is a download from Immich, so a
 * few more are on their way; a device picture is read from storage, so one keeps memory low on
 * phones.
 */
const PICTURES_AHEAD: Readonly<Record<SlideshowHome, number>> = { server: 3, device: 1 };

/** How many slides playing loads beyond the last one on screen. */
export function picturesAheadFor(home: SlideshowHome): number {
  return PICTURES_AHEAD[home];
}

export type PictureFailure =
  | { readonly kind: "skip"; readonly pictureId: string }
  | { readonly kind: "stop"; readonly failure: PlayerFailure };

/**
 * What playing makes of a picture that failed to load: a server picture Immich no longer has is
 * skipped; any other failure of a server picture means Immich isn't answering
 * (`dev-docs/server_library/IN_THE_APP.md`).
 */
export function pictureFailureFor(home: SlideshowHome, cause: unknown): PictureFailure {
  if (home === "device") return { kind: "stop", failure: "picture" };
  return cause instanceof PictureMissingFromImmichError
    ? { kind: "skip", pictureId: cause.pictureId }
    : { kind: "stop", failure: "immich" };
}
