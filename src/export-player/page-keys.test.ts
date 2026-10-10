import { describe, expect, it } from "vitest";
import { pageActionForKey } from "./page-keys";

const press = (
  key: string,
  modifiers: Partial<Record<"altKey" | "ctrlKey" | "metaKey", boolean>> = {},
) => ({
  key,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  ...modifiers,
});

describe("pageActionForKey", () => {
  it.each([
    [" ", "toggle-play"],
    ["k", "toggle-play"],
    ["K", "toggle-play"],
    ["ArrowLeft", "seek-back"],
    ["ArrowRight", "seek-forward"],
    ["m", "toggle-mute"],
    ["M", "toggle-mute"],
    ["f", "toggle-fullscreen"],
    ["F", "toggle-fullscreen"],
  ] as const)("maps %j to %s", (key, action) => {
    expect(pageActionForKey(press(key))).toBe(action);
  });

  it("leaves other keys and every key with a modifier to the browser", () => {
    expect(pageActionForKey(press("Escape"))).toBeNull();
    expect(pageActionForKey(press("f", { ctrlKey: true }))).toBeNull();
    expect(pageActionForKey(press("ArrowLeft", { altKey: true }))).toBeNull();
    expect(pageActionForKey(press("k", { metaKey: true }))).toBeNull();
  });
});
