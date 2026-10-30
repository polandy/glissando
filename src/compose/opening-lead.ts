import type { SlideshowTransition } from "../library/own-timing";
import type { StoredCard, StoredPicture } from "../library/stored-slideshow";
import { CARD_REVEAL_MS } from "../player/card-timing";
import { CARD_ALONE_MS, CARD_HOLD_MS, CARD_SLIDE_MS, pictureOf } from "./card-slide";
import { pictureTransition } from "./picture-transition";
import { snapToNextBeat } from "./snap-to-next-beat";
import { slideOfPicture, type SlideUnit } from "./slide-units";

/** How much real time the opening card adds before the beat snap, and where (ADR-0032). */
export interface OpeningLead {
  readonly insertedMs: number;
  /** True: widens slide unit 0's own duration. False: a dedicated slide plays before it. */
  readonly mergeOntoFirstUnit: boolean;
}

const NO_LEAD: OpeningLead = { insertedMs: 0, mergeOntoFirstUnit: false };

/**
 * `composeCards`'s opening-card choice (`compose-cards.ts`, `composeOpening`), decided the same
 * way but ahead of the beat snap it feeds (`TITLE_CARD_COMPOSITION.md`, Beats): a colour ground,
 * or a still picture card, always plays first for `CARD_SLIDE_MS`; a motion picture card leads
 * with `CARD_HOLD_MS` plus its reveal, merged onto a lone first slide that can carry it, or else
 * played alone for `CARD_ALONE_MS` more. A video's reveal fit is checked against its usual
 * transition length, not the beat-shortened one `composeCards` later picks — shortening only
 * helps it fit, so this stays the stricter case and avoids depending on that later step.
 */
export function openingLeadMs(
  card: StoredCard | undefined,
  pictures: readonly StoredPicture[],
  units: readonly SlideUnit[],
  beatsMs: readonly number[] | undefined,
  defaultTransition: SlideshowTransition,
  transitionShare?: number,
  maxTransitionMs?: number,
): OpeningLead {
  if (card === undefined || card.title === "") {
    return NO_LEAD;
  }
  if (card.background.kind === "colour") {
    return { insertedMs: CARD_SLIDE_MS, mergeOntoFirstUnit: false };
  }
  if (!card.motion) {
    return { insertedMs: CARD_SLIDE_MS, mergeOntoFirstUnit: false };
  }
  const picture = pictureOf(pictures, card.background.pictureId);
  const unitIndex = slideOfPicture(units, pictures.indexOf(picture));
  const structurallyMergeable =
    unitIndex === 0 && (units[0] as SlideUnit).pictureIndices.length === 1;
  const revealAtMs = snapToNextBeat(beatsMs, CARD_HOLD_MS);
  const leadMs = revealAtMs + CARD_REVEAL_MS;
  const mergeable =
    structurallyMergeable &&
    fitsFirstUnit(picture, units, revealAtMs, defaultTransition, transitionShare, maxTransitionMs);
  return mergeable
    ? { insertedMs: leadMs, mergeOntoFirstUnit: true }
    : { insertedMs: leadMs + CARD_ALONE_MS, mergeOntoFirstUnit: false };
}

/** The reveal-fit test `composeCards` runs against the built first slide, worked out here from
 * the stored picture alone: a non-video picture always fits; a video must clear its usual
 * transition-out length first. */
function fitsFirstUnit(
  picture: StoredPicture,
  units: readonly SlideUnit[],
  revealAtMs: number,
  defaultTransition: SlideshowTransition,
  transitionShare?: number,
  maxTransitionMs?: number,
): boolean {
  if (picture.video === undefined) {
    return true;
  }
  const durationMs = picture.video.endMs - picture.video.startMs;
  const transitionOutMs =
    pictureTransition(
      0,
      units.length,
      picture,
      durationMs,
      defaultTransition,
      transitionShare,
      maxTransitionMs,
    )?.durationMs ?? 0;
  return revealAtMs + CARD_REVEAL_MS <= durationMs - transitionOutMs;
}
