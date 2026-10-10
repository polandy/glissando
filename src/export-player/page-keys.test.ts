import { describe, expect, it } from "vitest";
import {
  pageActionForKey,
  pageKeyAction,
  timelineKeyAction,
  type PageKeyContext,
} from "./page-keys";

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

const PLAYING: PageKeyContext = { state: "playing", withMusic: true, withFullScreen: true };

describe("pageKeyAction", () => {
  it("acts on a key while the slideshow plays or is paused", () => {
    expect(pageKeyAction(press(" "), PLAYING)).toBe("toggle-play");
    expect(pageKeyAction(press("ArrowRight"), { ...PLAYING, state: "paused" })).toBe(
      "seek-forward",
    );
  });

  it.each(["start", "ended", "error"] as const)(
    "ignores every key while the %s card shows",
    (state) => {
      expect(pageKeyAction(press(" "), PLAYING)).toBe("toggle-play");
      expect(pageKeyAction(press(" "), { ...PLAYING, state })).toBeNull();
      expect(pageKeyAction(press("ArrowLeft"), { ...PLAYING, state })).toBeNull();
    },
  );

  it("ignores M in a slideshow without music", () => {
    expect(pageKeyAction(press("m"), PLAYING)).toBe("toggle-mute");
    expect(pageKeyAction(press("m"), { ...PLAYING, withMusic: false })).toBeNull();
  });

  it("ignores F where the browser has no element full screen", () => {
    expect(pageKeyAction(press("f"), PLAYING)).toBe("toggle-fullscreen");
    expect(pageKeyAction(press("f"), { ...PLAYING, withFullScreen: false })).toBeNull();
  });
});

describe("timelineKeyAction", () => {
  it("seeks with the arrow keys, as the page does", () => {
    expect(timelineKeyAction(press("ArrowLeft"))).toBe("seek-back");
    expect(timelineKeyAction(press("ArrowRight"))).toBe("seek-forward");
  });

  it("leaves every other key to the page", () => {
    expect(timelineKeyAction(press("ArrowRight"))).toBe("seek-forward");
    expect(timelineKeyAction(press(" "))).toBeNull();
    expect(timelineKeyAction(press("m"))).toBeNull();
    expect(timelineKeyAction(press("ArrowLeft", { altKey: true }))).toBeNull();
  });
});
