import { afterEach, describe, expect, it, vi } from "vitest";
import type { SlideshowChapter } from "../../../compose/chapters-of-slideshow";
import { mountWithTranslator } from "../../testing/mount-with-translator";
import { NO_SELECTION } from "./strip-selection";
import type { PictureTile } from "../view-models";
import PictureStrip from "./PictureStrip.svelte";

let destroy: (() => void) | null = null;
afterEach(() => {
  destroy?.();
  destroy = null;
});

const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function picture(id: string): PictureTile {
  return {
    id,
    thumbnailUrl: PIXEL,
    capturedAt: "2025-07-01T10:00:00Z",
    ownMotion: false,
    ownDurationMs: null,
    ownTransition: null,
    pairedWithNumber: null,
    blurredFill: false,
    alone: false,
    colours: { veil: "#404040", accent: "#C0C0C0" },
  };
}

function chapter(overrides: Partial<SlideshowChapter> = {}): SlideshowChapter {
  return {
    kind: "automatic",
    anchorPictureId: "p2",
    title: "Porto",
    subtitle: "Tag 3 · 21. Juni",
    automaticTitle: "Porto",
    automaticSubtitle: "Tag 3 · 21. Juni",
    titleEdited: false,
    subtitleEdited: false,
    hidden: false,
    ...overrides,
  };
}

function mountStrip(chapters: readonly SlideshowChapter[], onOpenChapter = vi.fn()) {
  const mounted = mountWithTranslator(PictureStrip, {
    pictures: [picture("p1"), picture("p2")],
    newPictureIds: new Set<string>(),
    selection: NO_SELECTION,
    mousePointer: true,
    onSelectionChange: () => {},
    onRemove: () => {},
    onRemoveGroup: () => {},
    onShiftGroup: () => {},
    onMoveGroup: () => {},
    onOpen: () => {},
    onView: () => {},
    suppressCards: true,
    chapters,
    onOpenChapter,
  });
  destroy = mounted.destroy;
  return { target: mounted.target, onOpenChapter };
}

describe("PictureStrip: trip chapters", () => {
  it("shows a chapter tile right before its anchor picture", () => {
    const { target } = mountStrip([chapter()]);

    const tiles = Array.from(target.querySelectorAll(".strip > li"));
    const chapterIndex = tiles.findIndex((li) => li.querySelector(".chip") !== null);
    const anchorIndex = tiles.findIndex(
      (li) => li.querySelector('[data-picture-id="p2"]') !== null,
    );

    expect(chapterIndex).toBeGreaterThanOrEqual(0);
    expect(chapterIndex).toBe(anchorIndex - 1);
  });

  it("omits a hidden automatic chapter from the strip entirely", () => {
    const { target } = mountStrip([chapter({ hidden: true })]);

    expect(target.querySelector(".chip")).toBeNull();
  });

  it("opens the chapter's sheet when its tile is tapped", () => {
    const { target, onOpenChapter } = mountStrip([chapter()]);

    target.querySelector<HTMLButtonElement>(".chip")?.click();

    expect(onOpenChapter).toHaveBeenCalledWith("p2");
  });
});
