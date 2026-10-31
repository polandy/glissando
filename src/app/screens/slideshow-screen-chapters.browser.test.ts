import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { ChapterSettingsEditor } from "../editing/chapter-settings-editor";
import { ResetUndo } from "../editing/reset-undo";
import { Toaster } from "../toast/toaster";
import { FakeScheduler } from "../../ui-kit/testing/fake-scheduler";
import { buttonNamed, mountScreen, tile, unmountScreen } from "./slideshow-screen-harness";

const CHAPTER_PORTS = {
  chapterDeletedText: () => "Kapitel gelöscht",
  chapterTitleResetText: () => "Kapiteltitel wieder automatisch",
  chapterSubtitleResetText: () => "Kapitel-Untertitel wieder automatisch",
};

afterEach(() => unmountScreen());

const sheet = () => document.querySelector("dialog");

function baseStored(): StoredSlideshow {
  return {
    id: "show",
    title: "Trip",
    createdAt: "2025-07-01T00:00:00Z",
    pictures: ["a", "b", "c"].map((id, index) => ({
      id,
      fileName: `${id}.jpg`,
      capturedAt: `2025-07-0${index + 1}T10:00:00Z`,
      width: 100,
      height: 100,
      colours: { veil: "#404040", accent: "#C0C0C0" },
    })),
    songs: [],
    secondsPerPicture: 5,
  };
}

/** A real `ChapterSettingsEditor` over an in-memory `StoredSlideshow`, for the insert wiring. */
function chapterEditor() {
  let current = baseStored();
  const applied: StoredSlideshow[] = [];
  const editor = new ChapterSettingsEditor(
    CHAPTER_PORTS,
    new ResetUndo(new Toaster(new FakeScheduler()), () => "Rückgängig"),
    () => current,
    (next) => {
      current = next;
      applied.push(next);
    },
  );
  return { editor, applied, current: () => current };
}

describe("SlideshowScreen: inserting a trip chapter from the selection bar", () => {
  it("offers Insert chapter only once a single picture is selected", () => {
    mountScreen(undefined, { chapterEditor: chapterEditor().editor });

    expect(() => buttonNamed("Kapitel davor einfügen")).toThrow();

    tile(1, "01.07.2025").click();
    flushSync();

    expect(buttonNamed("Kapitel davor einfügen")).toBeInstanceOf(HTMLButtonElement);
  });

  it("inserts the chapter before the selected picture and opens its sheet", () => {
    const { editor, current } = chapterEditor();
    mountScreen(undefined, { chapterEditor: editor });
    tile(2, "02.07.2025").click();
    flushSync();

    buttonNamed("Kapitel davor einfügen").click();
    flushSync();

    expect(current().addedChapters).toEqual([{ beforePictureId: "b" }]);
    expect(sheet()).not.toBeNull();
  });
});
