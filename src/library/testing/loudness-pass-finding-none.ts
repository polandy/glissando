import type { MusicLoudness } from "../../loudness";
import { LoudnessPass } from "../loudness-pass";
import type { LibraryStore } from "../library-store";
import { FakeLoudnessMeter } from "./fake-loudness-meter";

const SILENT: MusicLoudness = {
  blockMeanSquares: new Float32Array([0]),
  hopPeaks: new Float32Array([0]),
};

/**
 * A loudness pass over `store` that measures every track as silent, for screens whose test is
 * not about loudness; any error it meets fails the test.
 */
export function loudnessPassFindingNone(
  store: Pick<LibraryStore, "listSlideshows" | "musicLoudness" | "musicBlob" | "putMusicLoudness">,
): LoudnessPass {
  return new LoudnessPass({
    store,
    meter: new FakeLoudnessMeter(() => SILENT),
    log: (error) => {
      throw error;
    },
    reportError: (error) => {
      throw error;
    },
  });
}
