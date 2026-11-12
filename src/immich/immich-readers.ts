import { openClipInVideoElement } from "../import/browser/video-clip";
import { startPictureRenditionsWorker } from "../import/browser/start-picture-renditions-worker";
import { WorkerPictureRenditions } from "../import/browser/worker-picture-renditions";
import { decodePicture } from "../import/downscale";
import type { ImmichPictureReaders } from "../import/immich-picture-source";
import type { ImmichAvailability } from "./immich-availability";
import type { ImmichClient, ImmichUnavailableKind } from "./immich-client";

/**
 * How Immich's pictures and clips are read: for an intake, a server slideshow and a copy of one.
 * An original's renditions are made in a worker, so making one never holds a 4K slideshow's frame.
 */
export function createImmichReaders(
  client: ImmichClient,
  availability: ImmichAvailability,
  log: (error: unknown) => void,
): ImmichPictureReaders {
  const renditions = new WorkerPictureRenditions(startPictureRenditionsWorker, decodePicture);
  return {
    client,
    decode: (file) => renditions.decode(file),
    reportUnavailable: (kind: ImmichUnavailableKind) => availability.report(kind),
    log,
    videos: { client, openClip: (file) => openClipInVideoElement(file, log) },
  };
}
