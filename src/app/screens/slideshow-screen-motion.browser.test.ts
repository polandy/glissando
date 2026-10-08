import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import {
  buttonNamed,
  details,
  mountScreen,
  PIXEL,
  tile,
  unmountScreen,
} from "./slideshow-screen-harness";

afterEach(() => unmountScreen());

const ownMotionOnSecond = () => {
  const base = details(["a", "b", "c"]);
  return {
    ...base,
    ownMotionCount: 1,
    pictures: base.pictures.map((picture) => ({ ...picture, ownMotion: picture.id === "b" })),
  };
};

describe("SlideshowScreen, the way into the picture editor", () => {
  it("offers Edit in the selection bar, between Later and Remove, for the selected picture", () => {
    const { calls } = mountScreen();
    tile(2, "02.07.2025").click();
    flushSync();

    const labels = [...document.querySelectorAll(".bar button")].map((b) => b.textContent?.trim());
    buttonNamed("Bearbeiten").click();

    expect(labels.indexOf("Bearbeiten")).toBe(labels.indexOf("Später") + 1);
    expect(labels.indexOf("Entfernen")).toBe(labels.indexOf("Bearbeiten") + 1);
    expect(calls.edited).toEqual(["b"]);
  });

  it("opens the picture editor on a double-click with a mouse", () => {
    const { calls } = mountScreen(details(["a", "b"]), { mousePointer: true });

    tile(1, "01.07.2025").dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));

    expect(calls.edited).toEqual(["a"]);
  });

  it("leaves a double tap on a touch screen to selecting", () => {
    const { calls } = mountScreen(details(["a", "b"]), { mousePointer: false });
    const first = tile(1, "01.07.2025");
    first.click();

    first.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    flushSync();

    expect(first.getAttribute("aria-pressed")).toBe("true");
    expect(calls.edited).toEqual([]);
  });

  it("marks a picture with an own motion on its tile and in its label", () => {
    mountScreen(ownMotionOnSecond());

    const own = document.querySelector(
      'img[alt="Bild 2, aufgenommen am 02.07.2025, eigene Bewegung"]',
    );
    const badges = [...document.querySelectorAll(".strip .badge")];

    expect(own).not.toBeNull();
    expect(badges.map((badge) => badge.textContent?.trim())).toEqual(["eigen"]);
  });

  it("counts the own motions in the Ken Burns fact", () => {
    mountScreen(ownMotionOnSecond());

    const facts = document.querySelector(".rows")?.textContent ?? "";

    expect(facts).toContain("Ken Burns");
    expect(facts).toContain("automatisch, 1 eigene");
  });

  it("says just automatic while no picture has a motion of its own", () => {
    mountScreen(details(["a"], { coverUrl: PIXEL }));

    const facts = document.querySelector(".rows")?.textContent ?? "";

    expect(facts).toContain("Ken Burns");
    expect(facts).not.toContain("eigene");
  });
});
