import { musicGainAt } from "../../player";
import type { MusicEditorView } from "./music-editor-view";

/** The waveform SVGs' own units; each stretches to fill whatever box it is placed in. */
export const VIEW_WIDTH = 1000;
export const VIEW_HEIGHT = 100;
/** Share of a bar's slot the bar fills. */
export const BAR_FILL = 0.64;
/** A silent bar still shows as a line. */
export const MIN_BAR_HEIGHT = 1.5;

/** Bars inside a fade never shrink below this share, so the shape stays readable. */
const MIN_FADED_SHARE = 0.06;
/** Where the envelope line rests at full volume, just inside the top. */
const ENVELOPE_TOP = 2;

/** A bar's height share, 0..1, and whether it lies inside the excerpt. */
export interface WaveBar {
  readonly share: number;
  readonly inside: boolean;
}

type WaveMusic = Pick<MusicEditorView, "timing" | "durationMs" | "startMs" | "audibleEndMs">;

/** The bars of a track whose `heights` are its peaks; with the details, shrunk by the fades. */
export function waveBars(
  heights: readonly number[],
  music: WaveMusic,
  details: boolean,
): readonly WaveBar[] {
  return heights.map((height, index) => {
    const atMs = ((index + 0.5) / heights.length) * music.durationMs;
    const inside = atMs >= music.startMs && atMs <= music.audibleEndMs;
    const gain =
      inside && details
        ? Math.max(MIN_FADED_SHARE, musicGainAt(music.timing, atMs - music.startMs))
        : 1;
    return { share: height * gain, inside };
  });
}

/** The fade envelope as the `points` of a polyline over the bars. */
export function envelopePoints(music: Pick<WaveMusic, "timing" | "durationMs">): string {
  const { startMs, endMs, fadeInMs, fadeOutMs } = music.timing;
  const x = (ms: number) => (ms / music.durationMs) * VIEW_WIDTH;
  return [
    [x(startMs), fadeInMs > 0 ? VIEW_HEIGHT : ENVELOPE_TOP],
    [x(startMs + fadeInMs), ENVELOPE_TOP],
    [x(endMs - fadeOutMs), ENVELOPE_TOP],
    [x(endMs), fadeOutMs > 0 ? VIEW_HEIGHT : ENVELOPE_TOP],
  ]
    .map(([px, py]) => `${px},${py}`)
    .join(" ");
}
