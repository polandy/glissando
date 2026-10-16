import { openClipInVideoElement } from "../import/browser/video-clip";
import { decodePicture } from "../import/downscale";
import type { ImmichPictureReaders } from "../import/immich-picture-source";
import type { ImmichClient, ImmichUnavailableKind } from "./immich-client";

/**
 * How Immich's pictures are read, for an intake, a server slideshow and a copy of one; the intake
 * also gets a picked video clip opened.
 */
export function createImmichReaders(
  client: ImmichClient,
  reportUnavailable: (kind: ImmichUnavailableKind) => void,
  log: (error: unknown) => void,
): {
  readonly immichReaders: ImmichPictureReaders;
  readonly intakeImmichReaders: ImmichPictureReaders;
} {
  const immichReaders: ImmichPictureReaders = {
    client,
    decode: decodePicture,
    reportUnavailable,
    log,
  };
  return {
    immichReaders,
    intakeImmichReaders: { ...immichReaders, videos: { client, openClip: openClipInVideoElement } },
  };
}
