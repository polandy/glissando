import { BeatPass, type BeatPassPorts } from "../library/beat-pass";
import type { BeatDetector } from "../library/beat-detector";
import { LoudnessPass, type LoudnessPassPorts } from "../library/loudness-pass";
import type { LoudnessMeter } from "../library/loudness-meter";

export interface BackgroundMusicPasses {
  readonly beatPass: BeatPass;
  readonly loudnessPass: LoudnessPass;
  /** Listened to only when a server slideshow is opened; never started on its own. */
  readonly serverBeatPass: BeatPass;
  /** Listened to only when a server slideshow is opened; never started on its own. */
  readonly serverLoudnessPass: LoudnessPass;
}

export interface BackgroundMusicPassesPorts {
  readonly store: BeatPassPorts["store"] & LoudnessPassPorts["store"];
  readonly serverStore: BeatPassPorts["store"] & LoudnessPassPorts["store"];
  readonly beatDetector: BeatDetector;
  readonly loudnessMeter: LoudnessMeter;
  log(error: unknown): void;
  reportError(error: unknown): void;
}

/**
 * Starts the device's beat and loudness passes at boot (ADR-0021, ADR-0040). The first device to
 * open a server slideshow listens for its music's beats and loudness and keeps them on the server
 * for the others; a server out of reach ends either pass without a message: the pictures share
 * the music evenly and it plays unlevelled until the next opening tries again.
 */
export function startBackgroundMusicPasses(
  ports: BackgroundMusicPassesPorts,
): BackgroundMusicPasses {
  const beatPass = new BeatPass({
    store: ports.store,
    detector: ports.beatDetector,
    log: ports.log,
    reportError: ports.reportError,
  });
  beatPass.start();

  const loudnessPass = new LoudnessPass({
    store: ports.store,
    meter: ports.loudnessMeter,
    log: ports.log,
    reportError: ports.reportError,
  });
  loudnessPass.start();

  const serverBeatPass = new BeatPass({
    store: ports.serverStore,
    detector: ports.beatDetector,
    log: ports.log,
    reportError: ports.log,
  });

  const serverLoudnessPass = new LoudnessPass({
    store: ports.serverStore,
    meter: ports.loudnessMeter,
    log: ports.log,
    reportError: ports.log,
  });

  return { beatPass, loudnessPass, serverBeatPass, serverLoudnessPass };
}
