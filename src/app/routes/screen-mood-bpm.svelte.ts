import type { SongBeats } from "../../compose/playlist";
import { NO_SONG_BEATS } from "../../compose/playlist";
import type { BeatPass, BeatPassState } from "../../library/beat-pass";
import type { LibraryStore } from "../../library/library-store";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { storedSongBeats } from "../beats/music-beats-known";
import { slideshowMoodBpm, slideshowMoodTempoPending } from "../screens/slideshow/mood-tempo";

/**
 * The slideshow's tempo under its mood (ADR-0045): each song's beats as already stored, reread
 * once `load` is called with changed songs, overtaken by whatever the background pass finds this
 * session.
 */
export class ScreenMoodBpm {
  #storedBeats = $state.raw<SongBeats>(NO_SONG_BEATS);
  #passState: BeatPassState;
  readonly #pass: Pick<BeatPass, "state" | "subscribe">;
  readonly #store: Pick<LibraryStore, "musicBeats">;
  readonly #log: (error: unknown) => void;

  constructor(
    pass: Pick<BeatPass, "state" | "subscribe">,
    store: Pick<LibraryStore, "musicBeats">,
    log: (error: unknown) => void,
  ) {
    this.#pass = pass;
    this.#passState = $state.raw(pass.state);
    this.#store = store;
    this.#log = log;
  }

  /** Read inside a `$derived`, which keeps it until the stored beats or the pass changes. */
  of(stored: StoredSlideshow): number | undefined {
    return slideshowMoodBpm(stored, this.#storedBeats, this.#passState);
  }

  /** Read inside a `$derived`: whether `of(stored)` may still change once analysis catches up. */
  pendingOf(stored: StoredSlideshow): boolean {
    return slideshowMoodTempoPending(stored, this.#storedBeats, this.#passState);
  }

  /** Rereads the slideshow's songs' beats; the caller decides when they have changed. */
  load(stored: StoredSlideshow): void {
    storedSongBeats(this.#store, stored, this.#log).then(
      (beats) => (this.#storedBeats = beats),
      this.#log,
    );
  }

  /** Follows the pass; returns the unsubscribe. */
  follow(): () => void {
    return this.#pass.subscribe((next) => (this.#passState = next));
  }
}
