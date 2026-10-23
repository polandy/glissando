import { flushSync } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { chaptersOfSlideshow } from "../../../../compose/chapters-of-slideshow";
import type { Place } from "../../../../places/nearest-place";
import type { StoredPicture, StoredSlideshow } from "../../../../library/stored-slideshow";
import { ChapterSettingsEditor } from "../../../editing/chapter-settings-editor";
import { slideshowDetails } from "../../../library-views";
import { mountWithTranslator } from "../../../testing/mount-with-translator";
import { reactiveProps } from "../../../testing/reactive-props.svelte";
import ChapterSheet from "./ChapterSheet.svelte";

const LISBON: Place = { name: "Lisbon", latitude: 38.7223, longitude: -9.1393 };
const PORTO: Place = { name: "Porto", latitude: 41.1579, longitude: -8.6291 };

function picture(id: string, capturedAt: string, place?: Place): StoredPicture {
  return {
    id,
    fileName: `${id}.jpg`,
    capturedAt,
    width: 100,
    height: 100,
    colours: { veil: "#202020", accent: "#e0e0e0" },
    ...(place === undefined ? {} : { place }),
  };
}

// p1/p2 share Lisbon; p3's stay in Porto starts the automatic chapter before it (Rule C).
const TWO_STAYS: readonly StoredPicture[] = [
  picture("p1", "2025-06-14T09:00:00Z", LISBON),
  picture("p2", "2025-06-15T09:00:00Z", LISBON),
  picture("p3", "2025-06-21T09:00:00Z", PORTO),
];

function baseSlideshow(overrides: Partial<StoredSlideshow> = {}): StoredSlideshow {
  return {
    id: "show",
    title: "Trip",
    createdAt: "2025-06-01T00:00:00Z",
    pictures: TWO_STAYS,
    songs: [],
    secondsPerPicture: 5,
    ...overrides,
  };
}

const url = (id: string) => `${id}.jpg`;

let destroy: (() => void) | null = null;
afterEach(() => {
  destroy?.();
  destroy = null;
});

/** A required element matching `selector`, or a thrown error naming it. */
function must<T extends Element>(target: ParentNode, selector: string): T {
  const found = target.querySelector<T>(selector);
  if (found === null) {
    throw new Error(`no match for "${selector}"`);
  }
  return found;
}

/** A chapter sheet over a live `ChapterSettingsEditor`: edits store at once, like the real app's. */
function setUp(anchorPictureId: string | null, overrides: Partial<StoredSlideshow> = {}) {
  let current = baseSlideshow(overrides);
  const onClose = vi.fn();
  // Assigned once props exists, so its apply callback can update it (forward reference).
  let updateSlideshow: (next: StoredSlideshow) => void = () => {};
  const chapterEditor = new ChapterSettingsEditor(
    () => current,
    (next) => {
      current = next;
      updateSlideshow(next);
    },
  );
  const props = reactiveProps({
    slideshow: slideshowDetails(current, url, "de"),
    chapterEditor,
    anchorPictureId,
    onClose,
  });
  updateSlideshow = (next) => (props.slideshow = slideshowDetails(next, url, "de"));
  const mounted = mountWithTranslator(ChapterSheet, props);
  destroy = mounted.destroy;
  return { target: mounted.target, props, onClose, chapterEditor, current: () => current };
}

describe("ChapterSheet: an automatic chapter", () => {
  it("prefills the title and subtitle with the chapter's effective text", () => {
    const { target } = setUp("p3");
    const [chapter] = chaptersOfSlideshow(baseSlideshow(), "de");

    expect(target.querySelector<HTMLInputElement>("#chapter-title")?.value).toBe(chapter?.title);
    expect(target.querySelector<HTMLInputElement>("#chapter-subtitle")?.value).toBe(
      chapter?.subtitle,
    );
  });

  it("stores a typed title and marks the reset button no longer disabled", () => {
    const { target, current } = setUp("p3");

    const field = target.querySelector<HTMLInputElement>("#chapter-title");
    if (field !== null) {
      field.value = "Porto";
      field.dispatchEvent(new Event("input", { bubbles: true }));
    }
    flushSync();

    expect(current().chapterEdits).toEqual([{ pictureId: "p3", title: "Porto" }]);
    const reset = target.querySelector<HTMLButtonElement>(".field button");
    expect(reset?.getAttribute("aria-disabled")).toBe("false");
  });

  it("resets an edited title back to automatic", () => {
    const { target, props } = setUp("p3");
    const field = must<HTMLInputElement>(target, "#chapter-title");
    field.value = "Porto";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    flushSync();

    target.querySelector<HTMLButtonElement>(".field button")?.click();
    flushSync();

    const automatic = chaptersOfSlideshow(baseSlideshow(), "de")[0];
    expect(target.querySelector<HTMLInputElement>("#chapter-title")?.value).toBe(automatic?.title);
    expect(props.slideshow.chapters.find((c) => c.anchorPictureId === "p3")?.titleEdited).toBe(
      false,
    );
  });

  it("hides the chapter through its switch, keeping it in the listing", () => {
    const { target, current } = setUp("p3");

    target.querySelector<HTMLInputElement>('input[role="switch"]')?.click();
    flushSync();

    expect(current().chapterEdits).toEqual([{ pictureId: "p3", hidden: true }]);
  });

  it("offers no delete button for an automatic chapter", () => {
    const { target } = setUp("p3");

    expect(target.textContent).not.toContain("Kapitel löschen");
  });
});

describe("ChapterSheet: an added chapter", () => {
  function setUpAdded() {
    const set = setUp("p2");
    set.chapterEditor.insertChapter("p2");
    set.props.slideshow = slideshowDetails(set.current(), url, "de");
    flushSync();
    return set;
  }

  it("shows a delete button instead of a hide switch", () => {
    const { target } = setUpAdded();

    expect(target.textContent).toContain("Kapitel löschen");
    expect(
      target.querySelector('input[role="switch"][aria-label="Dieses Kapitel ausblenden"]'),
    ).toBeNull();
  });

  it("removes the chapter and closes on delete", () => {
    const { target, current, onClose } = setUpAdded();

    const deleteButton = Array.from(target.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Kapitel löschen"),
    );
    deleteButton?.click();

    expect(current().addedChapters).toBeUndefined();
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("ChapterSheet: general mode (no chapter picked)", () => {
  it("shows only the automatic-chapters switch, no preview or fields", () => {
    const { target } = setUp(null);

    expect(target.querySelector(".preview")).toBeNull();
    expect(target.querySelector("#chapter-title")).toBeNull();
    expect(target.querySelector('input[role="switch"]')).not.toBeNull();
  });

  it("turns automatic chapters off and back on", () => {
    const { target, current } = setUp(null);

    target.querySelector<HTMLInputElement>('input[role="switch"]')?.click();
    flushSync();
    expect(current().automaticChaptersOff).toBe(true);

    target.querySelector<HTMLInputElement>('input[role="switch"]')?.click();
    flushSync();
    expect(current().automaticChaptersOff).toBeUndefined();
  });

  it("disables the switch while the order is the owner's own", () => {
    const { target } = setUp(null, { ownOrder: true });

    const toggle = target.querySelector<HTMLInputElement>('input[role="switch"]');
    expect(toggle?.disabled).toBe(true);
    expect(target.textContent).toContain("Aus, solange du die Reihenfolge selbst bestimmst");
  });
});
