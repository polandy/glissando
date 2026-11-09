import { describe, expect, it } from "vitest";
import { performPlayerAction, playerActionForKey, type PlayerActionContext } from "./player-keys";
import type { SlideBoundaries } from "../../player/slide-boundaries";

const plain = { altKey: false, ctrlKey: false, metaKey: false };

const BOUNDARIES: SlideBoundaries = { starts: [0, 10, 20], duration: 30 };

type RecordedAction = "toggle-play" | "close" | "toggle-fullscreen" | { seek: number };

function contextAt(currentTime: number): PlayerActionContext & { ran: RecordedAction[] } {
  const ran: RecordedAction[] = [];
  return {
    ran,
    boundaries: BOUNDARIES,
    currentTime,
    togglePlay: () => ran.push("toggle-play"),
    seek: (time) => ran.push({ seek: time }),
    close: () => ran.push("close"),
    toggleFullscreen: () => ran.push("toggle-fullscreen"),
  };
}

describe("player keys", () => {
  it.each([
    [" ", "toggle-play"],
    ["ArrowLeft", "previous"],
    ["ArrowRight", "next"],
    ["Escape", "close"],
    ["f", "toggle-fullscreen"],
    ["F", "toggle-fullscreen"],
  ] as const)("maps %j to %s", (key, action) => {
    expect(playerActionForKey({ key, ...plain })).toBe(action);
  });

  it("ignores keys the player has no use for", () => {
    expect(playerActionForKey({ key: "x", ...plain })).toBeNull();
  });

  it.each([{ ctrlKey: true }, { metaKey: true }, { altKey: true }])(
    "leaves browser shortcuts alone (%j)",
    (modifier) => {
      expect(playerActionForKey({ key: "f", ...plain, ...modifier })).toBeNull();
    },
  );
});

describe("performPlayerAction", () => {
  it("toggles play", () => {
    const context = contextAt(5);
    performPlayerAction("toggle-play", context);
    expect(context.ran).toEqual(["toggle-play"]);
  });

  it("seeks to the next slide's start", () => {
    const context = contextAt(5);
    performPlayerAction("next", context);
    expect(context.ran).toEqual([{ seek: 10 }]);
  });

  it("does nothing on the last slide's next", () => {
    const context = contextAt(25);
    performPlayerAction("next", context);
    expect(context.ran).toEqual([]);
  });

  it("seeks to the current slide's start when previous is well under way", () => {
    const context = contextAt(15);
    performPlayerAction("previous", context);
    expect(context.ran).toEqual([{ seek: 10 }]);
  });

  it("closes", () => {
    const context = contextAt(5);
    performPlayerAction("close", context);
    expect(context.ran).toEqual(["close"]);
  });

  it("toggles fullscreen", () => {
    const context = contextAt(5);
    performPlayerAction("toggle-fullscreen", context);
    expect(context.ran).toEqual(["toggle-fullscreen"]);
  });
});
