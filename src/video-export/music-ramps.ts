import { musicGainAt, type MusicEnvelope, type PlacedMusicEnvelope } from "../player";

/**
 * A point of a gain automation: "set" jumps to `gain` at `atMs`, "ramp" goes there linearly from
 * the point before, as `setValueAtTime` and `linearRampToValueAtTime` do.
 */
export interface GainPoint {
  /** From the window's start. */
  readonly atMs: number;
  readonly gain: number;
  readonly kind: "set" | "ramp";
}

/**
 * `musicGainAt` over slideshow time `fromMs` to `toMs`, as the linear pieces it is made of:
 * between the fade boundaries (and where overlapping fades cross) it is linear, so ramps between
 * them reproduce it exactly. See ADR-0009.
 */
export function musicGainRamps(
  music: MusicEnvelope,
  fromMs: number,
  toMs: number,
): readonly GainPoint[] {
  const heardMs = music.endMs - music.startMs;
  const breakpoints = [
    music.fadeInMs,
    heardMs - music.fadeOutMs,
    fadesCrossAt(music, heardMs),
    heardMs,
    toMs,
  ]
    .filter((timeMs) => timeMs > fromMs && timeMs <= toMs)
    .sort((left, right) => left - right)
    .filter((timeMs, index, sorted) => index === 0 || sorted[index - 1] !== timeMs);
  const points: GainPoint[] = [{ atMs: 0, gain: musicGainAt(music, fromMs), kind: "set" }];
  for (const timeMs of breakpoints) {
    const atMs = timeMs - fromMs;
    const approached = timeMs === heardMs ? gainApproachingEnd(music, heardMs) : null;
    const reached = musicGainAt(music, timeMs);
    points.push({ atMs, gain: approached ?? reached, kind: "ramp" });
    if (approached !== null && approached !== reached) {
      points.push({ atMs, gain: reached, kind: "set" });
    }
  }
  return points;
}

/**
 * `trackGainAt` over slideshow time `fromMs` to `toMs`: silent before the track's place, then its
 * own envelope from there, so the tracks of a playlist each ramp on their own (ADR-0023).
 */
export function trackGainRamps(
  track: PlacedMusicEnvelope,
  fromMs: number,
  toMs: number,
): readonly GainPoint[] {
  if (fromMs >= track.atMs) {
    return musicGainRamps(track, fromMs - track.atMs, toMs - track.atMs);
  }
  const silent: GainPoint = { atMs: 0, gain: 0, kind: "set" };
  if (toMs <= track.atMs) {
    return [silent];
  }
  const startsAtMs = track.atMs - fromMs;
  const fromItsPlace = musicGainRamps(track, 0, toMs - track.atMs).map((point) => ({
    ...point,
    atMs: point.atMs + startsAtMs,
  }));
  return [silent, ...fromItsPlace];
}

/** Where a fade-in still under full volume meets the fade-out; none when they do not. */
function fadesCrossAt(music: MusicEnvelope, heardMs: number): number {
  if (music.fadeInMs <= 0 || music.fadeOutMs <= 0) {
    return Number.NaN;
  }
  const crossMs = (music.fadeInMs * heardMs) / (music.fadeInMs + music.fadeOutMs);
  return crossMs < music.fadeInMs ? crossMs : Number.NaN;
}

/** The gain just before the music ends, where it drops to silence. */
function gainApproachingEnd(music: MusicEnvelope, heardMs: number): number {
  if (music.fadeOutMs > 0) {
    return 0;
  }
  return music.fadeInMs > 0 ? Math.min(1, heardMs / music.fadeInMs) : 1;
}
