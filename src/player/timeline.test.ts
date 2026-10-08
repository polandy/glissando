import { describe, expect, it } from "vitest";
import type { Slide, Transition } from "./slideshow";
import { createTimeline } from "./timeline";

function slide(durationMs: number, transitionToNext?: Transition): Slide {
  const base: Slide = {
    image: { src: `picture-${durationMs}.jpg`, capturedAt: "2025-07-01" },
    durationMs,
    kenBurns: {
      from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
      to: { zoom: 1.2, centerX: 0.5, centerY: 0.5 },
      easing: "linear",
    },
  };
  return transitionToNext ? { ...base, transitionToNext } : base;
}

const crossfade = (durationMs: number): Transition => ({ effect: "crossfade", durationMs });

describe("createTimeline", () => {
  it("lasts the sum of the slide durations; transitions run inside them", () => {
    const timeline = createTimeline([slide(4000, crossfade(1000)), slide(5000), slide(3000)]);

    expect(timeline.durationMs).toBe(12000);
  });

  it("shows the first slide alone before its transition", () => {
    const timeline = createTimeline([slide(4000, crossfade(1000)), slide(5000)]);

    expect(timeline.frameAt(2000)).toEqual({
      kind: "slide",
      slide: { index: 0, kenBurnsProgress: 0.5 },
    });
  });

  it("runs the transition during the last part of the outgoing slide", () => {
    const timeline = createTimeline([slide(4000, crossfade(1000)), slide(5000)]);

    expect(timeline.frameAt(3500)).toEqual({
      kind: "transition",
      effect: "crossfade",
      progress: 0.5,
      from: { index: 0, kenBurnsProgress: 3500 / 4000 },
      to: { index: 1, kenBurnsProgress: 500 / 6000 },
    });
  });

  it("starts the incoming slide's Ken Burns with its transition", () => {
    const timeline = createTimeline([slide(4000, crossfade(1000)), slide(5000)]);

    expect(timeline.frameAt(3000)).toMatchObject({ to: { index: 1, kenBurnsProgress: 0 } });
  });

  it("ends the incoming slide's Ken Burns with its own slide", () => {
    const timeline = createTimeline([slide(4000, crossfade(1000)), slide(5000), slide(2000)]);

    expect(timeline.frameAt(8999)).toEqual({
      kind: "slide",
      slide: { index: 1, kenBurnsProgress: 5999 / 6000 },
    });
  });

  it("cuts hard between slides without a transition", () => {
    const timeline = createTimeline([slide(4000), slide(5000)]);

    expect(timeline.frameAt(3999)).toMatchObject({ kind: "slide", slide: { index: 0 } });
    expect(timeline.frameAt(4000)).toEqual({
      kind: "slide",
      slide: { index: 1, kenBurnsProgress: 0 },
    });
  });

  it.each([
    [-100, { index: 0, kenBurnsProgress: 0 }],
    [9000, { index: 1, kenBurnsProgress: 1 }],
    [20000, { index: 1, kenBurnsProgress: 1 }],
  ])("clamps %d ms to the slideshow", (timeMs, expected) => {
    const timeline = createTimeline([slide(4000), slide(5000)]);

    expect(timeline.frameAt(timeMs)).toEqual({ kind: "slide", slide: expected });
  });
});
