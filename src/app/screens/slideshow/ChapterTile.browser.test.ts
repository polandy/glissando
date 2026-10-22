import { afterEach, describe, expect, it, vi } from "vitest";
import type { SlideshowChapter } from "../../../compose/chapters-of-slideshow";
import { mountWithTranslator } from "../../testing/mount-with-translator";
import ChapterTile from "./ChapterTile.svelte";

let destroy: (() => void) | null = null;
afterEach(() => {
  destroy?.();
  destroy = null;
});

function chapter(overrides: Partial<SlideshowChapter> = {}): SlideshowChapter {
  return {
    kind: "automatic",
    anchorPictureId: "p3",
    title: "Lissabon",
    subtitle: "Tag 11–12 · 22.–23. Juni",
    automaticTitle: "Lissabon",
    automaticSubtitle: "Tag 11–12 · 22.–23. Juni",
    titleEdited: false,
    subtitleEdited: false,
    hidden: false,
    ...overrides,
  };
}

function mountTile(overrides: Partial<SlideshowChapter> = {}, onOpen = vi.fn()) {
  const mounted = mountWithTranslator(ChapterTile, { chapter: chapter(overrides), onOpen });
  destroy = mounted.destroy;
  return { target: mounted.target, onOpen };
}

describe("ChapterTile", () => {
  it("shows the chapter's own title and subtitle", () => {
    const { target } = mountTile();

    expect(target.querySelector(".title")?.textContent).toBe("Lissabon");
    expect(target.querySelector(".subtitle")?.textContent).toBe("Tag 11–12 · 22.–23. Juni");
  });

  it("opens the chapter's sheet on tap", () => {
    const { target, onOpen } = mountTile();

    target.querySelector<HTMLButtonElement>(".chip")?.click();

    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("shows no edited dot for a chapter with only automatic text", () => {
    const { target } = mountTile({ titleEdited: false, subtitleEdited: false });

    expect(target.querySelector(".dot")).toBeNull();
  });

  it("shows the edited dot when the title was edited", () => {
    const { target } = mountTile({ titleEdited: true });

    expect(target.querySelector(".dot")).not.toBeNull();
  });

  it("shows the edited dot when only the subtitle was edited", () => {
    const { target } = mountTile({ subtitleEdited: true });

    expect(target.querySelector(".dot")).not.toBeNull();
  });
});
