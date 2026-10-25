/**
 * The beat at or after `minMs`, else `minMs` itself: without beats, or none reaches that far
 * (`TITLE_CARD_COMPOSITION.md`, Beats). Its own file so `opening-lead.ts` can use it without
 * pulling in `snap-to-beats.ts`'s own `InsertedTime` dependency.
 */
export function snapToNextBeat(beatsMs: readonly number[] | undefined, minMs: number): number {
  const next = beatsMs?.find((beatMs) => beatMs >= minMs);
  return next ?? minMs;
}
