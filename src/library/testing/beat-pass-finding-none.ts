import { NO_BEATS } from "../../beats";
import { BeatPass } from "../beat-pass";
import type { LibraryStore } from "../stored-slideshow";
import { FakeBeatDetector } from "./fake-beat-detector";

/**
 * A beat pass over `store` that finds no clear beat in any music, for screens whose test is not
 * about beats; any error it meets fails the test.
 */
export function beatPassFindingNone(
  store: Pick<LibraryStore, "listSlideshows" | "musicBeats" | "musicBlob" | "putMusicBeats">,
): BeatPass {
  return new BeatPass({
    store,
    detector: new FakeBeatDetector(() => NO_BEATS),
    log: (error) => {
      throw error;
    },
    reportError: (error) => {
      throw error;
    },
  });
}
