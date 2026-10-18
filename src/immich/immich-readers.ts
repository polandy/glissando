import { openClipInVideoElement } from "../import/browser/video-clip";
import { decodePicture } from "../import/downscale";
import type { ImmichPictureReaders } from "../import/immich-picture-source";
import type { ImmichAvailability } from "./immich-availability";
import type { ImmichClient, ImmichUnavailableKind } from "./immich-client";

/** How Immich's pictures and clips are read: for an intake, a server slideshow and a copy of one. */
export function createImmichReaders(
  client: ImmichClient,
  availability: ImmichAvailability,
  log: (error: unknown) => void,
): ImmichPictureReaders {
  return {
    client,
    decode: decodePicture,
    reportUnavailable: (kind: ImmichUnavailableKind) => availability.report(kind),
    log,
    videos: { client, openClip: openClipInVideoElement },
  };
}
