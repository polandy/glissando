import { EVEN_PICTURE_CHANGES } from "../../library/own-music";
import type { StoredMusic, StoredSlideshow } from "../../library/stored-slideshow";
import type { BeatsStatus } from "../beats/music-beats-known";

/** What the music editor's "Picture changes" section shows (ADR-0021). */
export type PictureChangesView = PictureChangesState & {
  /**
   * How long each automatic picture stays when they last their own seconds (ADR-0022), so off the
   * beat they stay exactly that; absent while they fill the music, sharing it evenly off the beat.
   */
  readonly secondsPerPicture?: number;
};

type PictureChangesState =
  /** The beats are still being listened for; the pictures change evenly meanwhile. */
  | { readonly kind: "listening" }
  /** This device cannot decode the music; the next pass tries again. */
  | { readonly kind: "undecodable" }
  /** The music has no clear beat: the pictures change evenly, no choice offered. */
  | { readonly kind: "none" }
  | {
      readonly kind: "beats";
      /** The tempo, rounded to a whole beat per minute. */
      readonly beatsPerMinute: number;
      /** The automatic changes land on the beats; otherwise the music's choice is even. */
      readonly onTheBeat: boolean;
      /**
       * The positions (from 1) of the pictures with an own duration whose change still can fall
       * between beats: filling the music, with an automatic picture somewhere but none left after
       * it to take up the difference. Empty unless on the beat, and also empty with no automatic
       * picture anywhere, where every own duration moves about its own length instead
       * (`snapToBeats`).
       */
      readonly ownDurationNumbers: readonly number[];
    };

/** A beat under the waveform; every fourth one is drawn taller. */
export interface BeatTick {
  readonly atMs: number;
  readonly bar: boolean;
}

/** Every fourth beat, counted from the track's first, is drawn taller. */
const BEATS_PER_BAR = 4;

/** The "Picture changes" of `song`, one of the slideshow's, with what is known of its beats. */
export function pictureChangesView(
  stored: StoredSlideshow,
  song: StoredMusic,
  status: BeatsStatus,
): PictureChangesView {
  const ownSeconds =
    stored.pictureLength === undefined ? {} : { secondsPerPicture: stored.secondsPerPicture };
  if (status.kind !== "known") {
    return { ...status, ...ownSeconds };
  }
  if (status.beats.kind === "none") {
    return { kind: "none", ...ownSeconds };
  }
  const onTheBeat = song.pictureChanges !== EVEN_PICTURE_CHANGES;
  const handingOver = stored.pictures.slice(0, -1);
  // Filling the music (no own picture length) with no automatic picture left after it to absorb
  // the difference: nothing then moves this own duration's end onto a beat (`snapToBeats`).
  const fillsMusic = stored.pictureLength === undefined;
  const hasAutomatic = stored.pictures.some((picture) => picture.durationMs === undefined);
  const noAbsorberAfter = (index: number) =>
    stored.pictures.slice(index + 1).every((picture) => picture.durationMs !== undefined);
  return {
    kind: "beats",
    ...ownSeconds,
    beatsPerMinute: Math.round(status.beats.beatsPerMinute),
    onTheBeat,
    ownDurationNumbers:
      onTheBeat && fillsMusic && hasAutomatic
        ? handingOver.flatMap((picture, index) =>
            picture.durationMs !== undefined && noAbsorberAfter(index) ? [index + 1] : [],
          )
        : [],
  };
}

/** The track's beats as ticks while the pictures change on them; none otherwise. */
export function beatTicks(view: PictureChangesView, status: BeatsStatus): readonly BeatTick[] {
  if (view.kind !== "beats" || !view.onTheBeat || status.kind !== "known") {
    return [];
  }
  const { beats } = status;
  return beats.kind === "beats"
    ? beats.beatsMs.map((atMs, index) => ({ atMs, bar: index % BEATS_PER_BAR === 0 }))
    : [];
}
