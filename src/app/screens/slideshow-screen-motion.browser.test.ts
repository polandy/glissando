import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { buttonNamed, details, mountScreen, tile, unmountScreen } from "./slideshow-screen-harness";

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
  it("offers View then Edit in the selection bar, between Later and Remove, for the selected picture", () => {
    const { calls } = mountScreen();
    tile(2, "02.07.2025").click();
    flushSync();

    const labels = [...document.querySelectorAll(".bar button")].map((b) => b.textContent?.trim());
    buttonNamed("Bearbeiten").click();

    expect(labels.indexOf("Ansehen")).toBe(labels.indexOf("Später") + 1);
    expect(labels.indexOf("Bearbeiten")).toBe(labels.indexOf("Ansehen") + 1);
    expect(labels.indexOf("Kapitel davor einfügen")).toBe(labels.indexOf("Bearbeiten") + 1);
    expect(labels.indexOf("Verschieben nach\u00a0…")).toBe(
      labels.indexOf("Kapitel davor einfügen") + 1,
    );
    expect(labels.indexOf("Entfernen")).toBe(labels.indexOf("Verschieben nach\u00a0…") + 1);
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
    expect(badges.map((badge) => badge.textContent?.trim())).toEqual(["gewählt"]);
  });
});
