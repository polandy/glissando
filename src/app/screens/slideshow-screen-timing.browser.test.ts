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

const facts = () => document.querySelector(".rows")?.textContent?.replace(/\s+/g, " ") ?? "";

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

  it("counts own picture times and own transitions in the facts", () => {
    mountScreen(timedSecond());

    expect(facts()).toContain("Bildzeiten automatisch, 1 eigene");
    expect(facts()).toContain("Übergänge abwechselnd, 2 eigene");
  });

  it("says automatic and alternating while every picture follows the slideshow", () => {
    mountScreen(details(["a", "b"]));

    expect(facts()).toContain("Bildzeiten automatisch");
    expect(facts()).toContain("Übergänge abwechselnd");
    expect(facts()).not.toContain("eigene");
    expect(document.querySelector(".strip .timing-badge")).toBeNull();
  });

  it("names the music's length beside the duration when the slideshow outlasts it", () => {
    mountScreen(
      details(["a", "b"], { durationSeconds: 52, musicSeconds: 44, musicTitle: "m.mp3" }),
    );

    expect(facts()).toContain("Dauer 0:52 · Musik 0:44");
  });

  it("names the duration alone when the slideshow ends with the music", () => {
    mountScreen(
      details(["a", "b"], { durationSeconds: 44, musicSeconds: 44, musicTitle: "m.mp3" }),
    );

    expect(facts()).toContain("Dauer 0:44");
    expect(facts()).not.toContain("Musik 0:44");
  });

  it("names the duration alone when the two round to the same displayed second", () => {
    mountScreen(
      details(["a", "b"], { durationSeconds: 60.4, musicSeconds: 60.6, musicTitle: "m.mp3" }),
    );

    expect(facts()).toContain("Dauer 1:00");
    expect(facts()).not.toContain("Musik 1:00");
  });
});
