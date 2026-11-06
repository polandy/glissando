import { NO_BEATS } from "../../beats";
import type { LibraryStore } from "../library-store";
import { MusicAnalysisPass, type MusicAnalysisPassPorts } from "../music-analysis-pass";
import { FakeMusicAnalyser } from "./fake-music-analyser";
import { SILENT } from "./music-analysis-pass-fixtures";

/**
 * A music analysis pass over `store` that finds no clear beat in any music and measures every
 * track as silent, for screens whose test is not about the analysis; any error it meets fails
 * the test.
 */
export function analysisPassFindingNone(
  store: Pick<LibraryStore, keyof MusicAnalysisPassPorts["store"]>,
): MusicAnalysisPass {
  return new MusicAnalysisPass({
    store,
    analyser: new FakeMusicAnalyser(() => ({ beats: NO_BEATS, loudness: SILENT })),
    log: (error) => {
      throw error;
    },
    reportError: (error) => {
      throw error;
    },
  });
}
