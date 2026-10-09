import { automaticTransition } from "../../../compose";
import {
  CUT_TRANSITION,
  type SlideshowTransition,
  type TransitionChoice,
} from "../../../library/own-timing";
import { easeTransition, type TransitionEffect } from "../../../player";

/**
 * The picture editor's preview, laid out as the player lays out slides (ADR-0002): the picture
 * over its duration, its transition in the last part of it, then a moment of what follows.
 */

/** After the picture, the preview holds on the next picture (or the end card) this long. */
export const NEXT_HOLD_MS = 900;

/** Picking a transition starts the preview this long before it, so it shows at once. */
export const TRANSITION_LEAD_MS = 1200;

export interface PreviewPlan {
  readonly durationMs: number;
  /** Null for a cut and at the last picture. */
  readonly transition: { readonly effect: TransitionEffect; readonly durationMs: number } | null;
  /** Null at the last picture, where the slideshow ends. */
  readonly nextDurationMs: number | null;
}

/** The preview of a picture as the editor's view describes it. */
export function previewPlan(picture: {
  readonly durationMs: number;
  readonly transition: { readonly choice: TransitionChoice; readonly durationMs: number };
  readonly next: { readonly durationMs: number } | null;
}): PreviewPlan {
  const { choice, durationMs } = picture.transition;
  const plays = picture.next !== null && choice !== CUT_TRANSITION;
  return {
    durationMs: picture.durationMs,
    transition: plays ? { effect: choice, durationMs } : null,
    nextDurationMs: picture.next?.durationMs ?? null,
  };
}

/** Motion progress is linear, 0..1; a transition's progress is eased as the player eases it. */
export type PreviewScene =
  | { readonly kind: "picture"; readonly progress: number }
  | {
      readonly kind: "transition";
      readonly effect: TransitionEffect;
      readonly progress: number;
      readonly fromProgress: number;
      readonly toProgress: number;
    }
  | { readonly kind: "next"; readonly progress: number }
  | { readonly kind: "end" };

export function previewLengthMs(plan: { readonly durationMs: number }): number {
  return plan.durationMs + NEXT_HOLD_MS;
}

export function previewSceneAt(plan: PreviewPlan, elapsedMs: number): PreviewScene {
  const transitionMs = plan.transition?.durationMs ?? 0;
  const transitionFromMs = plan.durationMs - transitionMs;
  if (elapsedMs < transitionFromMs) {
    return { kind: "picture", progress: elapsedMs / plan.durationMs };
  }
  if (plan.nextDurationMs === null) {
    return elapsedMs < plan.durationMs
      ? { kind: "picture", progress: elapsedMs / plan.durationMs }
      : { kind: "end" };
  }
  // The next picture's motion runs from its incoming transition's start to its own end.
  const toProgress = Math.min(
    1,
    (elapsedMs - transitionFromMs) / (plan.nextDurationMs + transitionMs),
  );
  if (plan.transition === null || elapsedMs >= plan.durationMs) {
    return { kind: "next", progress: toProgress };
  }
  return {
    kind: "transition",
    effect: plan.transition.effect,
    progress: easeTransition((elapsedMs - transitionFromMs) / transitionMs),
    fromProgress: elapsedMs / plan.durationMs,
    toProgress,
  };
}

/** Where the preview starts when a transition is picked. */
export function transitionLeadInMs(plan: PreviewPlan): number {
  return Math.max(0, plan.durationMs - (plan.transition?.durationMs ?? 0) - TRANSITION_LEAD_MS);
}

/** Where the preview rests when a transition is picked and motion is reduced: half-way through. */
export function transitionHoldMs(plan: PreviewPlan): number {
  return plan.durationMs - (plan.transition?.durationMs ?? 0) / 2;
}

/** A transition tile's loop: a rest on this picture, the effect, a rest on the next. */
export const TILE_LOOP_MS = 2400;
const TILE_EFFECT_FROM = 0.25;
const TILE_EFFECT_SHARE = 0.45;
const TILE_CUT_AT = 0.5;

/** Where a still tile rests: half-way through its effect, just before a cut. */
export const TILE_STILL_MS = TILE_LOOP_MS * (TILE_EFFECT_FROM + TILE_EFFECT_SHARE / 2);

/** How far a tile's effect has run, 0 (this picture) to 1 (the next), `elapsedMs` into its loop. */
export function tileProgress(choice: TransitionChoice, elapsedMs: number): number {
  const loop = (elapsedMs % TILE_LOOP_MS) / TILE_LOOP_MS;
  if (choice === CUT_TRANSITION) {
    return loop < TILE_CUT_AT ? 0 : 1;
  }
  return easeTransition((loop - TILE_EFFECT_FROM) / TILE_EFFECT_SHARE);
}

/** What a tile shows `elapsedMs` into its loops: its choice, the alternating one's in turn. */
export function tileEffect(choice: SlideshowTransition, elapsedMs: number): TransitionChoice {
  return automaticTransition(Math.floor(elapsedMs / TILE_LOOP_MS), choice);
}
