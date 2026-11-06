import type { MusicAnalyser } from "../library/music-analyser";
import { MusicAnalysisPass, type MusicAnalysisPassPorts } from "../library/music-analysis-pass";

export interface BackgroundMusicPasses {
  readonly analysisPass: MusicAnalysisPass;
  /** Analyses only when a server slideshow is opened; never started on its own. */
  readonly serverAnalysisPass: MusicAnalysisPass;
}

export interface BackgroundMusicPassesPorts {
  readonly store: MusicAnalysisPassPorts["store"];
  readonly serverStore: MusicAnalysisPassPorts["store"];
  readonly analyser: MusicAnalyser;
  log(error: unknown): void;
  reportError(error: unknown): void;
}

/**
 * Starts the device's music analysis pass at boot (ADR-0021, ADR-0040, ADR-0051). The first
 * device to open a server slideshow analyses its music's beats and loudness and keeps them on
 * the server for the others; a server out of reach ends the pass without a message: the pictures
 * share the music evenly and it plays unlevelled until the next opening tries again.
 */
export function startBackgroundMusicPasses(
  ports: BackgroundMusicPassesPorts,
): BackgroundMusicPasses {
  const analysisPass = new MusicAnalysisPass({
    store: ports.store,
    analyser: ports.analyser,
    log: ports.log,
    reportError: ports.reportError,
  });
  analysisPass.start();

  const serverAnalysisPass = new MusicAnalysisPass({
    store: ports.serverStore,
    analyser: ports.analyser,
    log: ports.log,
    reportError: ports.log,
  });

  return { analysisPass, serverAnalysisPass };
}
