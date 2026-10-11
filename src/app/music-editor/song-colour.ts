/** The design tokens `--gl-song-1` … `--gl-song-6`, taken in turn by the songs' places. */
const SONG_COLOUR_COUNT = 6;

/** The colour token of the song at `number`, from 1, in the playlist. */
export function songColour(number: number): string {
  return `var(--gl-song-${((number - 1) % SONG_COLOUR_COUNT) + 1})`;
}
