import { NO_SONG_BEATS, NO_SONG_LOUDNESS, type SongBeats, type SongLoudness } from "../../compose";
import type { LibraryStore } from "../../library/library-store";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { storedSongBeats } from "../beats/music-beats-known";
import { storedSongLoudness } from "../loudness/music-loudness-composed";
import { moodEnergyPacing, type MoodEnergyPacing } from "../screens/slideshow/mood-energy-pacing";
import type { ScreenMoodBpm } from "./screen-mood-bpm.svelte";

/**
 * The info panel's "Picture times" range under the energy pacing (ADR-0046): each song's beats
 * and loudness as already stored, reread once `load` is called with changed songs. Unlike the
 * mood tempo (`ScreenMoodBpm`), no background pass is merged in live: the Mood sheet's own
 * preview reads the same already-stored data, with no "still analysing" state to show either.
 */
export class ScreenEnergyPacing {
  #beats = $state.raw<SongBeats>(NO_SONG_BEATS);
  #loudness = $state.raw<SongLoudness>(NO_SONG_LOUDNESS);
  readonly #store: Pick<LibraryStore, "musicBeats" | "musicLoudness">;
  readonly #log: (error: unknown) => void;

  constructor(
    store: Pick<LibraryStore, "musicBeats" | "musicLoudness">,
    log: (error: unknown) => void,
  ) {
    this.#store = store;
    this.#log = log;
  }

  /** Read inside a `$derived`, which keeps it until the stored beats or loudness changes. */
  of(stored: StoredSlideshow): MoodEnergyPacing {
    return moodEnergyPacing(stored, stored.mood, this.#beats, this.#loudness);
  }

  /** Rereads the slideshow's songs' beats and loudness; the caller decides when they have changed. */
  load(stored: StoredSlideshow): void {
    storedSongBeats(this.#store, stored, this.#log).then(
      (beats) => (this.#beats = beats),
      this.#log,
    );
    storedSongLoudness(this.#store, stored, this.#log).then(
      (loudness) => (this.#loudness = loudness),
      this.#log,
    );
  }
}

/** Rereads `moodBpm`'s and `energyPacing`'s beats/loudness together, on the same trigger. */
export function loadMusicAnalysis(
  stored: StoredSlideshow,
  moodBpm: Pick<ScreenMoodBpm, "load">,
  energyPacing: Pick<ScreenEnergyPacing, "load">,
): void {
  moodBpm.load(stored);
  energyPacing.load(stored);
}
