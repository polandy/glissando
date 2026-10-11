import type { MusicBeats } from "../../beats";
import type { BeatPass, BeatPassState } from "../../library/beat-pass";
import type { LibraryStore } from "../../library/stored-slideshow";
import { beatsStatus, READING_BEATS, type BeatsStatus } from "./music-beats-known";

export interface TrackBeatsPorts {
  readonly store: Pick<LibraryStore, "musicBeats">;
  readonly pass: Pick<BeatPass, "subscribe">;
  log(error: unknown): void;
}

/**
 * What an editor knows of one track's beats while it is open: the stored result, read once, and
 * what the background pass finds meanwhile (ADR-0021). Tells every change to `onChange`.
 */
export class TrackBeats {
  /** Resolves once the stored beats are read, or their failure logged. */
  readonly read: Promise<void>;
  readonly #stopPass: () => void;
  #stored: MusicBeats | undefined | typeof READING_BEATS = READING_BEATS;
  #pass: BeatPassState | undefined;

  constructor(musicId: string, ports: TrackBeatsPorts, onChange: (status: BeatsStatus) => void) {
    const tell = (): void => {
      if (this.#pass !== undefined) onChange(beatsStatus(musicId, this.#stored, this.#pass));
    };
    this.#stopPass = ports.pass.subscribe((state) => {
      this.#pass = state;
      tell();
    });
    this.read = ports.store.musicBeats(musicId).then(
      (beats) => {
        this.#stored = beats;
        tell();
      },
      (error: unknown) => {
        // Unread, the beats are what the pass finds; until then the pictures share the music evenly.
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
