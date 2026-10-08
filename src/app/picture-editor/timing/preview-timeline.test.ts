import { describe, expect, it } from "vitest";
import { easeTransition } from "../../../player";
import {
  NEXT_HOLD_MS,
  previewLengthMs,
  previewPlan,
  previewSceneAt,
  TILE_STILL_MS,
  tileProgress,
  transitionHoldMs,
  transitionLeadInMs,
  type PreviewPlan,
} from "./preview-timeline";

const withCircle: PreviewPlan = {
  durationMs: 5000,
  transition: { effect: "circle-open", durationMs: 1000 },
  nextDurationMs: 4000,
};
const withCut: PreviewPlan = { durationMs: 5000, transition: null, nextDurationMs: 4000 };
const last: PreviewPlan = { durationMs: 5000, transition: null, nextDurationMs: null };

describe("previewSceneAt", () => {
  it("shows the picture alone until its transition starts, its motion linear in time", () => {
    expect(previewSceneAt(withCircle, 2000)).toEqual({ kind: "picture", progress: 0.4 });
  });

  it("runs the transition in the picture's last part, eased as the player eases it", () => {
    expect(previewSceneAt(withCircle, 4250)).toEqual({
      kind: "transition",
      effect: "circle-open",
      progress: easeTransition(0.25),
      fromProgress: 0.85,
      toProgress: 250 / 5000,
    });
  });

  it("after the transition, shows the next picture, its motion running from the transition's start", () => {
    expect(previewSceneAt(withCircle, 5500)).toEqual({ kind: "next", progress: 1500 / 5000 });
  });

  it("with a cut, shows the picture to its end, then the next from its start", () => {
    expect(previewSceneAt(withCut, 4999)).toEqual({ kind: "picture", progress: 4999 / 5000 });
    expect(previewSceneAt(withCut, 5400)).toEqual({ kind: "next", progress: 400 / 4000 });
  });

  it("at the last picture, shows the end of the slideshow after its duration", () => {
    expect(previewSceneAt(last, 5000)).toEqual({ kind: "end" });
  });
});

describe("the preview's loop", () => {
  it("lasts the picture's duration plus a hold on what follows", () => {
    expect(previewLengthMs(withCircle)).toBe(5000 + NEXT_HOLD_MS);
  });

  it("starts a moment before the transition when one is picked", () => {
    expect(transitionLeadInMs(withCircle)).toBe(2800);
    expect(transitionLeadInMs({ ...withCircle, durationMs: 2000 })).toBe(0);
  });

  it("holds half-way through the transition when motion is reduced", () => {
    expect(transitionHoldMs(withCircle)).toBe(4500);
    expect(transitionHoldMs(withCut)).toBe(5000);
  });
});

describe("tileProgress", () => {
  it("rests on this picture, runs the effect eased, then rests on the next", () => {
    expect(tileProgress("dissolve", 0)).toBe(0);
    expect(tileProgress("dissolve", 1140)).toBeCloseTo(0.5);
    expect(tileProgress("dissolve", 2000)).toBe(1);
  });

  it("switches a cut at once, half-way through the loop", () => {
    expect(tileProgress("cut", 1199)).toBe(0);
    expect(tileProgress("cut", 1200)).toBe(1);
  });

  it("loops", () => {
    expect(tileProgress("crossfade", 2400 + 1140)).toBeCloseTo(0.5);
  });

  it("standing still, shows an effect half-way and a cut before it switches", () => {
    expect(tileProgress("wipe-right", TILE_STILL_MS)).toBeCloseTo(0.5);
    expect(tileProgress("cut", TILE_STILL_MS)).toBe(0);
  });
});

describe("previewPlan", () => {
  const picture = {
    durationMs: 5000,
    transition: { choice: "dissolve", durationMs: 1000 },
    next: { durationMs: 4000 },
  } as const;

  it("plays the picture's transition into the next picture", () => {
    expect(previewPlan(picture)).toEqual({
      durationMs: 5000,
      transition: { effect: "dissolve", durationMs: 1000 },
      nextDurationMs: 4000,
    });
  });

  it("plays none for a cut, and at the last picture has no next", () => {
    expect(
      previewPlan({ ...picture, transition: { choice: "cut", durationMs: 0 } }).transition,
    ).toBeNull();
    expect(previewPlan({ ...picture, next: null })).toEqual({
      durationMs: 5000,
      transition: null,
      nextDurationMs: null,
    });
  });
});
