import { ease } from "./easing";
import type { Card } from "./slideshow";

/**
 * How a title card moves over time (ADR-0032, `dev-docs/player/TITLE_CARDS.md` § Timing). Pure:
 * the renderers and the editor's preview all read the same numbers through this module.
 */

/** How long the text takes to fade and drift in, from `enterAtMs` (ease-out). */
export const CARD_ENTER_MS = 800;
/** How long the veil takes to settle to its full amount. */
export const CARD_VEIL_MS = 1400;
/** How long the reveal takes: the text dissolves and the veil lifts. */
export const CARD_REVEAL_MS = 1400;
/** Every fade's duration under reduced motion, in place of its usual length. */
export const CARD_REDUCED_FADE_MS = 400;

/** The drift at the start of the enter phase and the end of the reveal phase, in em. */
const ENTER_DRIFT_EM = 0.4;
const REVEAL_DRIFT_EM = -0.3;

export interface CardTiming {
  readonly textOpacity: number;
  readonly driftEm: number;
  readonly veilAmount: number;
  readonly captionOpacity: number;
}

/** 0..1 progress through a `durationMs` window starting at `startMs`, clamped at both ends. */
function windowProgress(slideTimeMs: number, startMs: number, durationMs: number): number {
  return Math.min(1, Math.max(0, (slideTimeMs - startMs) / durationMs));
}

/**
 * The card's text opacity, drift and veil amount at slide time `slideTimeMs`. `revealAtMs` and
 * `veil` are absent on a card that only enters and holds, as on most title and closing slides.
 */
export function cardTimingAt(card: Card, slideTimeMs: number, reducedMotion: boolean): CardTiming {
  const enterAtMs = card.enterAtMs ?? 0;
  const enterMs = reducedMotion ? CARD_REDUCED_FADE_MS : CARD_ENTER_MS;
  const revealMs = reducedMotion ? CARD_REDUCED_FADE_MS : CARD_REVEAL_MS;
  const enterProgress = ease("ease-out", windowProgress(slideTimeMs, enterAtMs, enterMs));
  const revealProgress =
    card.revealAtMs === undefined
      ? 0
      : ease("ease-in-out", windowProgress(slideTimeMs, card.revealAtMs, revealMs));

  const textOpacity = enterProgress * (1 - revealProgress);
  const driftEm = reducedMotion
    ? 0
    : (1 - enterProgress) * ENTER_DRIFT_EM + revealProgress * REVEAL_DRIFT_EM;
  const veilAmount = veilAmountAt(card, slideTimeMs, revealProgress, reducedMotion);

  return { textOpacity, driftEm, veilAmount, captionOpacity: 1 - textOpacity };
}

function veilAmountAt(
  card: Card,
  slideTimeMs: number,
  revealProgress: number,
  reducedMotion: boolean,
): number {
  if (card.veil === undefined) {
    return 0;
  }
  const enterAtMs = card.enterAtMs ?? 0;
  // A card from the slide's start shows its picture veiled from the first frame; one that starts
  // later veils in with its text.
  if (enterAtMs === 0) {
    return card.veil.amount * (1 - revealProgress);
  }
  const veilMs = reducedMotion ? CARD_REDUCED_FADE_MS : CARD_VEIL_MS;
  const veilInProgress = ease("ease-in-out", windowProgress(slideTimeMs, enterAtMs, veilMs));
  return veilInProgress * card.veil.amount * (1 - revealProgress);
}

/** The black amount (0 clear, 1 black) at show time `showTimeMs`, over the last `endFadeMs`. */
export function endFadeAmount(
  endFadeMs: number,
  showDurationMs: number,
  showTimeMs: number,
): number {
  const startMs = showDurationMs - endFadeMs;
  return ease("ease-in-out", windowProgress(showTimeMs, startMs, endFadeMs));
}
