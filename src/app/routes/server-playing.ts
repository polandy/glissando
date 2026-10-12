import type { LibraryStore, StoredSlideshow } from "../../library/stored-slideshow";
import { PictureMissingFromImmichError } from "../../server-library/server-slideshow-store";
import type { PlayerFailure } from "../player/player-failure";
import type { PrepareRendition } from "../player/prepare/prepared-pictures";
import type { PlaybackQuality } from "../settings/playback-quality";
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
 * Slides loaded beyond the last one on screen: a server picture's rendition may be a large one
 * made from the original, so a few more are decoded in time; a device picture is read from
 * storage, so one keeps memory low on phones.
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

/**
 * Where a server slideshow's pictures come from in `quality` (ADR-0027): 1440 is Immich's
 * preview, 4K the display rendition made on the device from the original.
 */
export function serverRenditionFor(
  store: Pick<LibraryStore, "pictureBlob" | "playbackPictureBlob">,
  quality: PlaybackQuality,
): PrepareRendition {
  return quality === "4k"
    ? (id, signal) => store.pictureBlob(id, signal)
    : (id, signal) => store.playbackPictureBlob(id, signal);
}
