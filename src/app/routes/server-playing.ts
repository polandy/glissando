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

export type PictureFailure =
  | { readonly kind: "skip"; readonly pictureId: string }
  | { readonly kind: "stop"; readonly failure: PlayerFailure };

/**
 * What playing makes of a picture that failed to load: a server picture Immich no longer has is
 * skipped; any other failure of a server picture means Immich isn't answering
 * (`dev-docs/SERVER_LIBRARY.md`, Playing and exporting).
 */
export function pictureFailureFor(home: SlideshowHome, cause: unknown): PictureFailure {
  if (home === "device") return { kind: "stop", failure: "picture" };
  return cause instanceof PictureMissingFromImmichError
    ? { kind: "skip", pictureId: cause.pictureId }
    : { kind: "stop", failure: "immich" };
}
