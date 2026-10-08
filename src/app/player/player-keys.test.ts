import { describe, expect, it } from "vitest";
import { playerActionForKey } from "./player-keys";

const plain = { altKey: false, ctrlKey: false, metaKey: false };

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
