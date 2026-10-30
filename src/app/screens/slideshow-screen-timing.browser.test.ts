import { afterEach, describe, expect, it } from "vitest";
import { details, mountScreen, unmountScreen } from "./slideshow-screen-harness";

afterEach(() => unmountScreen());

const timedSecond = () => {
  const base = details(["a", "b", "c"]);
  return {
    ...base,
    ownDurationCount: 1,
    ownTransitionCount: 2,
    pictures: base.pictures.map((picture) =>
      picture.id === "b"
        ? { ...picture, ownDurationMs: 8000, ownTransition: "circle-open" as const }
        : picture.id === "a"
          ? { ...picture, ownTransition: "cut" as const }
          : picture,
    ),
  };
};

describe("SlideshowScreen, a picture's own timing", () => {
  it("marks an own duration and an own transition on the tile and in its label", () => {
    mountScreen(timedSecond());

    const timed = document.querySelector(
      'img[alt="Bild 2, aufgenommen am 02.07.2025, eigene Dauer 8 s, eigener Übergang Kreis"]',
    );
    const marks = [...document.querySelectorAll<HTMLElement>(".strip .timing-badge")];

    expect(timed).not.toBeNull();
    expect(marks.map((mark) => mark.textContent?.trim() || mark.title)).toEqual([
      "Schnitt",
      "8 s",
      "Kreis",
    ]);
  });
});
