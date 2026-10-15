import { duckFactorAt, VIDEO_DUCK_RAMP_MS, type VideoSoundSpan } from "../player";
import type { GainPoint } from "./music-ramps";

/**
 * `duckFactorAt` over show time `fromMs` to `toMs` as the linear pieces it is made of: its bends
 * lie only at the spans' ramp boundaries, so ramps between them reproduce it exactly. Chained
 * after the music's own gain, the product is what the player plays.
 */
export function duckGainRamps(
  spans: readonly VideoSoundSpan[],
  fromMs: number,
  toMs: number,
): readonly GainPoint[] {
  const bends = spans
    .flatMap(({ startMs, endMs }) => [
      startMs - VIDEO_DUCK_RAMP_MS,
      startMs,
      endMs,
      endMs + VIDEO_DUCK_RAMP_MS,
    ])
    .filter((timeMs) => timeMs > fromMs && timeMs < toMs);
  const times = [...new Set([...bends, toMs])].sort((left, right) => left - right);
  return [
    { atMs: 0, gain: duckFactorAt(fromMs, spans), kind: "set" },
    ...times.map((timeMs) => ({
      atMs: timeMs - fromMs,
      gain: duckFactorAt(timeMs, spans),
      kind: "ramp" as const,
    })),
  ];
}
