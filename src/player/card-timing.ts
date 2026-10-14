import { itemCount } from "./card-items";
import { ease } from "./easing";
import type { Card, CardEntrance, Easing } from "./slideshow";

/**
 * How a title card moves over time (ADR-0032, `dev-docs/player/TITLE_CARDS.md` § Timing,
 * § Entrances). Pure: the renderers and the editor's preview all read the same numbers through
 * this module.
 */

/** How long `rise` (the default entrance) takes to fade and drift in, from `enterAtMs`. */
export const CARD_ENTER_MS = 800;
/** How long the veil takes to settle to its full amount. */
export const CARD_VEIL_MS = 1400;
/** How long the reveal takes: the text dissolves and the veil lifts, for every entrance. */
export const CARD_REVEAL_MS = 1400;
/** Every fade's duration under reduced motion, in place of its usual length. */
export const CARD_REDUCED_FADE_MS = 400;
/** No entrance's enter phase is longer than this; it is less than `CARD_HOLD_MS` (compose-cards.ts). */
export const CARD_ENTER_MAX_MS = 2000;

/** An entrance's per-item motion and, for a staggered one, its step and spread. */
interface EntranceSpec {
  readonly enterItemMs: number;
  readonly enterEase: Easing;
  /** Drift at the start of the item's enter, in em; 0 for an entrance with no drift. */
  readonly enterDriftEm: number;
  readonly revealItemMs: number;
  /** Drift at the end of the item's reveal, in em; 0 for an entrance with no drift. */
  readonly revealDriftEm: number;
  /** 0 for a whole-text entrance, which never staggers (`itemCount` is always 1). */
  readonly enterStepMs: number;
  readonly enterSpreadMs: number;
  readonly revealStepMs: number;
  readonly revealSpreadMs: number;
}

const ENTRANCE_SPECS: Readonly<Record<CardEntrance, EntranceSpec>> = {
  rise: {
    enterItemMs: 800,
    enterEase: "ease-out",
    enterDriftEm: 0.4,
    revealItemMs: 1400,
    revealDriftEm: -0.3,
    enterStepMs: 0,
    enterSpreadMs: 0,
    revealStepMs: 0,
    revealSpreadMs: 0,
  },
  words: {
    enterItemMs: 500,
    enterEase: "ease-out",
    enterDriftEm: 0.4,
    revealItemMs: 600,
    revealDriftEm: 0,
    enterStepMs: 120,
    enterSpreadMs: 1200,
    revealStepMs: 80,
    revealSpreadMs: 800,
  },
  letters: {
    enterItemMs: 350,
    enterEase: "ease-out",
    enterDriftEm: 0.15,
    revealItemMs: 400,
    revealDriftEm: 0,
    enterStepMs: 40,
    enterSpreadMs: 1600,
    revealStepMs: 25,
    revealSpreadMs: 1000,
  },
  focus: {
    enterItemMs: 1000,
    enterEase: "ease-out",
    enterDriftEm: 0,
    revealItemMs: 1400,
    revealDriftEm: 0,
    enterStepMs: 0,
    enterSpreadMs: 0,
    revealStepMs: 0,
    revealSpreadMs: 0,
  },
  "slow-fade": {
    enterItemMs: 1600,
    enterEase: "ease-in-out",
    enterDriftEm: 0,
    revealItemMs: 1400,
    revealDriftEm: 0,
    enterStepMs: 0,
    enterSpreadMs: 0,
    revealStepMs: 0,
    revealSpreadMs: 0,
  },
};

/** The scale `focus` draws its sharp text at when fully hidden (blurred, at the start/end). */
const FOCUS_SCALE_DELTA = 0.04;

/** `focus`'s blurred copy is rasterised once with a blur radius this fraction of the stage height. */
export const CARD_FOCUS_BLUR_SHARE = 0.012;

export interface CardTiming {
  readonly textOpacity: number;
  readonly driftEm: number;
  readonly veilAmount: number;
  readonly captionOpacity: number;
}

/** A single item's own visual: `focus`'s is a cross-fade (`blurOpacity`), not a drift. */
export interface CardItemVisual {
  readonly opacity: number;
  readonly driftEm: number;
  readonly scale: number;
  /** The blurred copy's opacity; 0 outside `focus`, where the sharp copy alone is drawn. */
  readonly blurOpacity: number;
}

/** 0..1 progress through a `durationMs` window starting at `startMs`, clamped at both ends. */
function windowProgress(slideTimeMs: number, startMs: number, durationMs: number): number {
  if (durationMs <= 0) {
    return slideTimeMs >= startMs ? 1 : 0;
  }
  return Math.min(1, Math.max(0, (slideTimeMs - startMs) / durationMs));
}

/** `min(step, spread / (n − 1))` for `n` items, so a long title still lands within `spread`. */
function stagger(stepMs: number, spreadMs: number, n: number): number {
  return n <= 1 ? 0 : Math.min(stepMs, spreadMs / (n - 1));
}

/**
 * The enter phase's whole length for `card`'s entrance: the last item's stagger offset plus its
 * own enter duration, which is why `rise`/`focus`/`slow-fade` (one item) are just their own
 * duration. Never longer than `CARD_ENTER_MAX_MS`. Needs only `card`'s text and entrance, so the
 * parser can validate `revealAtMs` against it without a layout.
 */
export function cardEnterMs(card: Pick<Card, "title" | "subtitle" | "entrance">): number {
  const spec = ENTRANCE_SPECS[card.entrance];
  const n = itemCount(card);
  const length = stagger(spec.enterStepMs, spec.enterSpreadMs, n) * (n - 1) + spec.enterItemMs;
  return Math.min(length, CARD_ENTER_MAX_MS);
}

/**
 * The card's text opacity, drift and veil amount at slide time `slideTimeMs`: the "presence"
 * (`dev-docs/player/TITLE_CARDS.md` § Timing) over the entrance's whole enter phase and the
 * fixed `CARD_REVEAL_MS` reveal phase, for the caption's opacity and the veil. `revealAtMs` and
 * `veil` are absent on a card that only enters and holds, as on most title and closing slides.
 */
export function cardTimingAt(card: Card, slideTimeMs: number, reducedMotion: boolean): CardTiming {
  const spec = ENTRANCE_SPECS[card.entrance];
  const enterAtMs = card.enterAtMs ?? 0;
  const enterMs = reducedMotion ? CARD_REDUCED_FADE_MS : cardEnterMs(card);
  const revealMs = reducedMotion ? CARD_REDUCED_FADE_MS : CARD_REVEAL_MS;
  const enterEase: Easing = reducedMotion ? "linear" : spec.enterEase;
  const revealEase: Easing = reducedMotion ? "linear" : "ease-in-out";
  const enterProgress = ease(enterEase, windowProgress(slideTimeMs, enterAtMs, enterMs));
  const revealProgress =
    card.revealAtMs === undefined
      ? 0
      : ease(revealEase, windowProgress(slideTimeMs, card.revealAtMs, revealMs));

  const textOpacity = enterProgress * (1 - revealProgress);
  const driftEm = reducedMotion
    ? 0
    : (1 - enterProgress) * spec.enterDriftEm + revealProgress * spec.revealDriftEm;
  const veilAmount = veilAmountAt(card, slideTimeMs, revealProgress, reducedMotion);

  return { textOpacity, driftEm, veilAmount, captionOpacity: 1 - textOpacity };
}

/**
 * Item `index` of `itemCount`'s own visual at `slideTimeMs` (§ Entrances): its own staggered
 * enter window, and the reveal's reversed order, each with the entrance's own drift (none for
 * `words`/`letters`/`slow-fade` reveal) and, for `focus`, the cross-fade and scale. Under
 * reduced motion every entrance is a plain `CARD_REDUCED_FADE_MS` fade, no stagger.
 */
export function cardItemTimingAt(
  card: Pick<Card, "entrance" | "enterAtMs" | "revealAtMs">,
  itemIndex: number,
  itemsTotal: number,
  slideTimeMs: number,
  reducedMotion: boolean,
): CardItemVisual {
  const spec = ENTRANCE_SPECS[card.entrance];
  const enterAtMs = card.enterAtMs ?? 0;
  const enterMs = reducedMotion ? CARD_REDUCED_FADE_MS : spec.enterItemMs;
  const revealMs = reducedMotion ? CARD_REDUCED_FADE_MS : spec.revealItemMs;
  const enterStagger = reducedMotion
    ? 0
    : stagger(spec.enterStepMs, spec.enterSpreadMs, itemsTotal);
  const revealStagger = reducedMotion
    ? 0
    : stagger(spec.revealStepMs, spec.revealSpreadMs, itemsTotal);
  const reverseIndex = itemsTotal - 1 - itemIndex;

  const enterEase: Easing = reducedMotion ? "linear" : spec.enterEase;
  const revealEase: Easing = reducedMotion ? "linear" : "ease-in-out";
  const enterProgress = ease(
    enterEase,
    windowProgress(slideTimeMs, enterAtMs + itemIndex * enterStagger, enterMs),
  );
  const revealProgress =
    card.revealAtMs === undefined
      ? 0
      : ease(
          revealEase,
          windowProgress(slideTimeMs, card.revealAtMs + reverseIndex * revealStagger, revealMs),
        );

  const presence = enterProgress * (1 - revealProgress);
  const driftEm = reducedMotion
    ? 0
    : (1 - enterProgress) * spec.enterDriftEm + revealProgress * spec.revealDriftEm;

  if (card.entrance === "focus" && !reducedMotion) {
    return {
      opacity: presence,
      driftEm: 0,
      scale: 1 + FOCUS_SCALE_DELTA * (1 - presence),
      blurOpacity: Math.min(1, 2 * presence) * (1 - presence),
    };
  }
  return { opacity: presence, driftEm, scale: 1, blurOpacity: 0 };
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
