import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import type { Place } from "../../places/nearest-place";
import { slideshowDetails } from "../library-views";
import { ChapterSettingsEditor } from "../editing/chapter-settings-editor";
import { ResetUndo } from "../editing/reset-undo";
import { Toaster } from "../toast/toaster";
import { FakeScheduler } from "../../ui-kit/testing/fake-scheduler";
import {
  buttonNamed,
  byLabel,
  details,
  mountScreen,
  tile,
  unmountScreen,
} from "./slideshow-screen-harness";

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

    expect(() => byLabel("Kapitel davor einfügen")).toThrow();

    tile(1, "01.07.2025").click();
    flushSync();

    expect(byLabel("Kapitel davor einfügen")).toBeInstanceOf(HTMLButtonElement);
  });

  it("inserts the chapter before the selected picture and opens its sheet", () => {
    const { editor, current } = chapterEditor();
    mountScreen(undefined, { chapterEditor: editor });
    tile(2, "02.07.2025").click();
    flushSync();

    byLabel("Kapitel davor einfügen").click();
    flushSync();

    expect(current().addedChapters).toEqual([{ beforePictureId: "b" }]);
    expect(sheet()).not.toBeNull();
  });
});

const LISBON: Place = { name: "Lisbon", latitude: 38.7223, longitude: -9.1393 };
const PORTO: Place = { name: "Porto", latitude: 41.1579, longitude: -8.6291 };

// p3's stay in Porto starts an automatic chapter before it; the added chapter sits before p2.
function tripWithAddedChapter(): StoredSlideshow {
  const stay = (id: string, capturedAt: string, place: Place) => ({
    width: 100,
    height: 100,
    colours: { veil: "#404040", accent: "#C0C0C0" },
    id,
    fileName: `${id}.jpg`,
    capturedAt,
    place,
  });
  return {
    ...baseStored(),
    pictures: [
      stay("p1", "2025-06-14T09:00:00Z", LISBON),
      stay("p2", "2025-06-15T09:00:00Z", LISBON),
      stay("p3", "2025-06-21T09:00:00Z", PORTO),
    ],
    addedChapters: [{ beforePictureId: "p2", title: "Mein Kapitel" }],
  };
}

describe("SlideshowScreen: the Trip chapters switch in Fine settings", () => {
  it("hides and brings back the automatic chapter markers, keeping the added chapter", () => {
    let current = tripWithAddedChapter();
    const editor = new ChapterSettingsEditor(
      CHAPTER_PORTS,
      new ResetUndo(new Toaster(new FakeScheduler()), () => "Rückgängig"),
      () => current,
      (next) => {
        current = next;
        mounted.props.slideshow = slideshowDetails(next, (id) => `${id}.jpg`, "de");
      },
    );
    const mounted = mountScreen(
      slideshowDetails(current, (id) => `${id}.jpg`, "de"),
      {
        chapterEditor: editor,
      },
    );
    const chip = (title: string) =>
      Array.from(document.querySelectorAll(".chip")).find((c) => c.textContent?.includes(title));
    buttonNamed("Weitere Einstellungen").click();
    flushSync();
    expect(chip("Mein Kapitel")).toBeDefined();
    expect(chip("Porto")).toBeDefined();
    const toggle = document.querySelector<HTMLInputElement>(
      'input[role="switch"][aria-label="Reisekapitel"]',
    );

    toggle?.click();
    flushSync();

    expect(chip("Mein Kapitel")).toBeDefined();
    expect(chip("Porto")).toBeUndefined();
    expect(toggle?.checked).toBe(false);

    toggle?.click();
    flushSync();

    expect(chip("Porto")).toBeDefined();
    expect(toggle?.checked).toBe(true);
  });

  it("is switched off, with its reason, while the order is the owner's own", () => {
    mountScreen(details(["a", "b", "c"], { ownOrder: true }));

    const toggle = document.querySelector<HTMLInputElement>(
      'input[role="switch"][aria-label="Reisekapitel"]',
    );
    expect(toggle?.disabled).toBe(true);
    expect(document.body.textContent).toContain("Aus, solange du die Reihenfolge selbst bestimmst");
  });
});
