import type { MusicLoudness } from "../../loudness";
import type { LoudnessPass, LoudnessPassState } from "../../library/loudness-pass";
import type { LibraryStore } from "../../library/stored-slideshow";
import { loudnessStatus, READING_LOUDNESS, type LoudnessStatus } from "./music-loudness-known";

export interface TrackLoudnessPorts {
  readonly store: Pick<LibraryStore, "musicLoudness">;
  readonly pass: Pick<LoudnessPass, "subscribe">;
  log(error: unknown): void;
}

/**
 * What an editor knows of one track's loudness while it is open: the stored result, read once,
 * and what the background pass finds meanwhile (ADR-0040). Tells every change to `onChange`.
 */
export class TrackLoudness {
  /** Resolves once the stored loudness is read, or its failure logged. */
  readonly read: Promise<void>;
  readonly #stopPass: () => void;
  #stored: MusicLoudness | undefined | typeof READING_LOUDNESS = READING_LOUDNESS;
  #pass: LoudnessPassState | undefined;

  constructor(
    musicId: string,
    ports: TrackLoudnessPorts,
    onChange: (status: LoudnessStatus) => void,
  ) {
    const tell = (): void => {
      if (this.#pass !== undefined) onChange(loudnessStatus(musicId, this.#stored, this.#pass));
    };
    this.#stopPass = ports.pass.subscribe((state) => {
      this.#pass = state;
      tell();
    });
    this.read = ports.store.musicLoudness(musicId).then(
      (loudness) => {
        this.#stored = loudness;
        tell();
      },
      (error: unknown) => {
        // Unread, the loudness is what the pass finds; until then the song plays unlevelled.
        ports.log(error);
        this.#stored = undefined;
        tell();
      },
    );
  }

  dispose(): void {
    this.#stopPass();
  }
}
