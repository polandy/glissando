import "../../styles/tokens.css";
import "../../styles/base.css";
import { afterEach, describe, expect, it } from "vitest";
import { createTranslator } from "../i18n/translator";
import { mountWithTranslator } from "../testing/mount-with-translator";
import SlideshowCard from "./SlideshowCard.svelte";
import type { SlideshowSummary } from "./view-models";

const TODAY = "2025-12-01T10:00:00Z";

const summary = (createdAt: string | undefined): SlideshowSummary => ({
  id: "lake",
  title: "Summer by the lake",
  coverUrls: [],
  pictureCount: 40,
  durationSeconds: 200,
  hasMusic: false,
  ...(createdAt === undefined ? {} : { createdAt }),
});

let destroy = () => {};
afterEach(() => destroy());

function mountCard(slideshow: SlideshowSummary, language: "de" | "en" = "en"): HTMLElement {
  const mounted = mountWithTranslator(
    SlideshowCard,
    { slideshow, today: TODAY, onOpen: () => {} },
    { current: createTranslator(language) },
  );
  destroy = mounted.destroy;
  return mounted.target;
}

const createdLine = (target: HTMLElement) =>
  target.querySelector(".created")?.textContent.trim() ?? null;

describe("SlideshowCard, the Created line", () => {
  it("says when the slideshow was created, without the year in the current year", () => {
    const target = mountCard(summary("2025-11-02T12:00:00Z"));

    expect(target.querySelector(".name")?.textContent).toBe("Summer by the lake");
    expect(createdLine(target)).toBe("Created 2 Nov");
  });

  it("adds the year for an earlier year", () => {
    expect(createdLine(mountCard(summary("2024-11-02T12:00:00Z")))).toBe("Created 2 Nov 2024");
  });

  it("is written in German for German", () => {
    expect(createdLine(mountCard(summary("2025-11-02T12:00:00Z"), "de"))).toBe(
      "Erstellt am 2. Nov.",
    );
  });

  it("is left out for a card that does not know its creation date", () => {
    const target = mountCard(summary(undefined));

    expect(target.querySelector(".name")?.textContent).toBe("Summer by the lake");
    expect(createdLine(target)).toBeNull();
  });
});
