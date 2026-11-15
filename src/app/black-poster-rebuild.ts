import { openClipInVideoElement } from "../import/browser/video-clip";
import type { DecodedPicture } from "../import/downscale";
import { samplePictureColourPixels } from "../import/sample-picture-colours";
import { readVideoFile } from "../import/video-read";
import { rebuildBlackPosters, type PosterRebuildPorts } from "../library/poster-rebuild";

/** What the device's black posters are rebuilt with. */
export interface BlackPosterRebuildDependencies {
  readonly store: PosterRebuildPorts["store"];
  /** Decodes a poster frame like any imported picture. */
  decode(file: File): Promise<DecodedPicture>;
  /** Takes the pictures whose poster changed, so their focus is looked for again. */
  onRebuilt(pictureIds: readonly string[]): void;
  log(error: unknown): void;
}

/**
 * Rebuilds, in the background, the black posters of the device's video slides from their stored
 * clips, the way an import makes a poster (`rebuildBlackPosters`).
 */
export function startBlackPosterRebuild(deps: BlackPosterRebuildDependencies): Promise<void> {
  const { store, decode, onRebuilt, log } = deps;
  return rebuildBlackPosters({
    store,
    pixels: samplePictureColourPixels,
    poster: async (clip, fileName) => {
      const read = await readVideoFile(new File([clip], fileName, { type: clip.type }), {
        openClip: (file) => openClipInVideoElement(file, log),
        decode,
      });
      return read.decoded;
    },
    onRebuilt,
    log,
  });
}
