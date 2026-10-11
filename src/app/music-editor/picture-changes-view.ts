import { EVEN_PICTURE_CHANGES } from "../../library/own-music";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import type { BeatsStatus } from "../beats/music-beats-known";

/** What the music editor's "Picture changes" section shows (ADR-0021). */
export type PictureChangesView =
  /** The beats are still being listened for; the pictures share the music evenly meanwhile. */
  | { readonly kind: "listening" }
  /** This device cannot decode the music; the next pass tries again. */
  | { readonly kind: "undecodable" }
  /** The music has no clear beat: the pictures share it evenly, no choice offered. */
  | { readonly kind: "none" }
  | {
      readonly kind: "beats";
      /** The tempo, rounded to a whole beat per minute. */
      readonly beatsPerMinute: number;
      /** The automatic changes land on the beats; otherwise the music's choice is even. */
      readonly onTheBeat: boolean;
      /**
       * The positions (from 1) of the pictures with an own duration that hand over to another
       * picture, whose change can fall between beats; empty unless on the beat.
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

export function pictureChangesView(
  stored: StoredSlideshow,
  status: BeatsStatus,
): PictureChangesView {
  if (status.kind !== "known") {
    return status;
  }
  if (status.beats.kind === "none") {
    return { kind: "none" };
  }
  const onTheBeat = stored.music?.pictureChanges !== EVEN_PICTURE_CHANGES;
  const handingOver = stored.pictures.slice(0, -1);
  return {
    kind: "beats",
    beatsPerMinute: Math.round(status.beats.beatsPerMinute),
    onTheBeat,
    ownDurationNumbers: onTheBeat
      ? handingOver.flatMap((picture, index) =>
          picture.durationMs === undefined ? [] : [index + 1],
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
