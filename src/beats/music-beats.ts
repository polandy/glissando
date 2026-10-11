/**
 * What the beat detection found in a piece of music (ADR-0021): the individual beats, which
 * follow a song that speeds up or slows down, or no clear beat at all.
 */
export type MusicBeats =
  | {
      readonly kind: "beats";
      /** Each beat in whole ms of the track, ascending. */
      readonly beatsMs: readonly number[];
      /** The tempo the beats were tracked at; a song with a changing tempo has its average. */
      readonly beatsPerMinute: number;
    }
  | { readonly kind: "none" };

/** Music without a clear beat, or not looked at: the pictures share it evenly. */
export const NO_BEATS: MusicBeats = { kind: "none" };
