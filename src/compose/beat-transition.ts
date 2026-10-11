/**
 * How long the transition at the end of a slide lasts: for a slide that ends on a beat, the most
 * whole beats, counted back along `beatsMs`, that fit `usualMs`, so it starts on a beat too; else,
 * or when a single beat is longer, `usualMs` (ADR-0021). `slideEndMs` and `beatsMs` share one
 * timeline; the beats ascend.
 */
export function beatTransitionDurationMs(
  slideEndMs: number,
  usualMs: number,
  beatsMs: readonly number[],
): number {
  const endBeat = beatsMs.indexOf(slideEndMs);
  if (endBeat < 0) {
    return usualMs;
  }
  let durationMs = usualMs;
  for (let startBeat = endBeat - 1; startBeat >= 0; startBeat -= 1) {
    const beatsLongMs = slideEndMs - (beatsMs[startBeat] as number);
    if (beatsLongMs > usualMs) {
      break;
    }
    durationMs = beatsLongMs;
  }
  return durationMs;
}
