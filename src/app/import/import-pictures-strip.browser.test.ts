import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { PictureImportState } from "../../import/picture-import";
import type { StoredPicture } from "../../library/stored-slideshow";
import { mountWithTranslator } from "../testing/mount-with-translator";
import ImportPicturesStrip from "./ImportPicturesStrip.svelte";
import { SessionArrangement } from "./session-arrangement";

const picture = (id: string): StoredPicture => ({
  id,
  capturedAt: "2025-07-01T10:00:00Z",
  fileName: `${id}.jpg`,
  width: 100,
  height: 100,
  colours: { veil: "#404040", accent: "#C0C0C0" },
});

/** A fake `PictureImport` store sliver, just enough for `SessionArrangement` to reconcile against. */
function fakePictures(ids: readonly string[]) {
  const state = {
    total: 0,
    done: 0,
    pictures: ids.map(picture),
    picks: [],
    skipped: [],
    storageFull: false,
    busy: false,
    failed: false,
  } satisfies PictureImportState;
  return {
    state,
    subscribe: (listener: (state: PictureImportState) => void) => {
      listener(state);
      return () => undefined;
    },
  };
}

/** A real arrangement over `ids`, capture order until moved or shuffled. */
function arrangementWith(ids: readonly string[], randomValues: readonly number[] = []) {
  const values = [...randomValues];
  return new SessionArrangement({
    pictures: fakePictures(ids),
    exempt: () => undefined,
    random: () => values.shift() ?? 0,
  });
}

let unmounts: (() => void)[] = [];
afterEach(() => {
  for (const unmount of unmounts) unmount();
  unmounts = [];
});

function mountStrip(options: {
  readonly ids: readonly string[];
  readonly withoutUrl?: readonly string[];
  readonly pending?: number;
  readonly busy?: boolean;
  readonly arrangement?: SessionArrangement | null;
  readonly onAddMore?: { onPickFiles: () => void; onPickFolder: () => void } | null;
  readonly onOpenImmich?: (() => void) | null;
}) {
  const {
    ids,
    withoutUrl = [],
    pending = 0,
    busy = false,
    arrangement = null,
    onAddMore = { onPickFiles: () => {}, onPickFolder: () => {} },
    onOpenImmich = null,
  } = options;
  const pictures = ids.map(picture);
  const urls = new Map(ids.filter((id) => !withoutUrl.includes(id)).map((id) => [id, "data:,"]));
  const removed: string[] = [];
  const viewed: string[] = [];
  const mounted = mountWithTranslator(ImportPicturesStrip, {
    pictures,
    urls,
    pending,
    busy,
    arrangement,
    onAddMore,
    onOpenImmich,
    onRemove: (pictureId: string) => removed.push(pictureId),
    onView: (pictureId: string) => viewed.push(pictureId),
  });
  unmounts.push(mounted.destroy);
  return { target: mounted.target, removed, viewed };
}

const text = (element: Element | null | undefined): string =>
  (element?.textContent ?? "").replace(/\s+/g, " ").trim();
const tiles = (target: HTMLElement) => [
  ...target.querySelectorAll<HTMLButtonElement>(".strip button.pick"),
];
const press = (key: string) => {
  document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  flushSync();
};

describe("ImportPicturesStrip, placeholders", () => {
  it("shimmers a placeholder for a picture without a thumbnail yet and for each pending file, only the first running", () => {
    const { target } = mountStrip({ ids: ["a", "b", "c"], withoutUrl: ["c"], pending: 2 });

    const placeholders = [...target.querySelectorAll(".strip .placeholder")];
    expect(placeholders).toHaveLength(3);
    expect(placeholders.map((placeholder) => placeholder.getAttribute("aria-hidden"))).toEqual([
      "true",
      "true",
      "true",
    ]);
    expect(placeholders.map((placeholder) => placeholder.querySelector(".bar") !== null)).toEqual([
      true,
      false,
      false,
    ]);
    // Never a tab stop: no button and no tabindex of its own.
    for (const placeholder of placeholders) {
      expect(placeholder.querySelector("button")).toBeNull();
    }
  });
});

describe("ImportPicturesStrip, viewing and removing", () => {
  it("opens the focused tile with F", () => {
    const { target, viewed } = mountStrip({ ids: ["a", "b"] });

    tiles(target)[1]?.focus();
    press("f");

    expect(viewed).toEqual(["b"]);
  });

  it("removes the focused tile with Delete", () => {
    const { target, removed } = mountStrip({ ids: ["a", "b"] });

    tiles(target)[0]?.focus();
    press("Delete");

    expect(removed).toEqual(["a"]);
  });
});

describe("ImportPicturesStrip, the selection bar", () => {
  it("while adding, without arranging, offers only View and Remove, no Earlier or Later", () => {
    const { target } = mountStrip({ ids: ["a", "b"], arrangement: null });

    tiles(target)[0]?.click();
    flushSync();

    const bar = target.querySelector('[role="toolbar"]');
    expect(bar).not.toBeNull();
    const labels = [...(bar?.querySelectorAll("button") ?? [])].map((button) => text(button));
    expect(labels).toEqual(["Ansehen", "Entfernen", "Fertig"]);
  });

  it("while arranging a new slideshow, also offers Earlier and Later", () => {
    const arrangement = arrangementWith(["a", "b", "c"]);
    const { target } = mountStrip({ ids: ["a", "b", "c"], arrangement });

    tiles(target)[1]?.click();
    flushSync();

    const bar = target.querySelector('[role="toolbar"]');
    const labels = [...(bar?.querySelectorAll("button") ?? [])].map((button) => text(button));
    expect(labels).toEqual(["Früher", "Später", "Ansehen", "Entfernen", "Fertig"]);
  });
});

describe("ImportPicturesStrip, adding more", () => {
  it("offers the add menu from the strip head", () => {
    const { target } = mountStrip({ ids: ["a", "b"] });

    const headButton = target.querySelector('.strip-head button[aria-haspopup="menu"]');
    expect(headButton).not.toBeNull();

    headButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    flushSync();

    expect(target.querySelector('[role="menu"]')).not.toBeNull();
  });

  it("has no add tile after the placeholders; the head button is the only way in", () => {
    const { target } = mountStrip({ ids: ["a", "b"], pending: 1 });

    expect(target.querySelector('.strip-head button[aria-haspopup="menu"]')).not.toBeNull();
    expect(target.querySelector("li.tile button.add-tile")).toBeNull();
  });

  it("offers only From Immich while linking a server slideshow", () => {
    const opened: boolean[] = [];
    const { target } = mountStrip({
      ids: ["a"],
      onAddMore: null,
      onOpenImmich: () => opened.push(true),
    });

    const headButton = target.querySelector('.strip-head button[aria-haspopup="menu"]');
    expect(headButton).not.toBeNull();
    headButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    flushSync();

    const items = [...target.querySelectorAll('[role="menuitem"]')].map((item) => text(item));
    expect(items).toEqual(["Aus Immich"]);
  });

  it("shows no add button and no add tile with neither on offer", () => {
    const { target } = mountStrip({ ids: ["a"], onAddMore: null, onOpenImmich: null });

    expect(target.querySelector('.strip-head button[aria-haspopup="menu"]')).toBeNull();
    expect(target.querySelector("li.tile button.add-tile")).toBeNull();
  });
});

describe("ImportPicturesStrip, the order rule", () => {
  it("reads capture order while the import runs, until Shuffle makes it the user's own", () => {
    const arrangement = arrangementWith(["a", "b", "c"], [0]);
    const { target } = mountStrip({ ids: ["a", "b", "c"], busy: true, arrangement });

    expect(text(target.querySelector(".sorted"))).toBe(
      "Aufnahmereihenfolge · neue Bilder werden nach Datum einsortiert",
    );

    target.querySelector<HTMLButtonElement>("button.shuffle")?.click();
    flushSync();

    expect(text(target.querySelector(".sorted"))).toBe(
      "Eigene Reihenfolge · neue Bilder kommen ans Ende",
    );
  });
});

describe("ImportPicturesStrip, arranging after the import", () => {
  const tileIds = (target: HTMLElement) =>
    tiles(target).map((tile) => tile.closest("[data-picture-id]")?.getAttribute("data-picture-id"));

  it("shows the shuffled order once Shuffle is pressed", () => {
    const arrangement = arrangementWith(["a", "b", "c"], [0]);
    const { target } = mountStrip({ ids: ["a", "b", "c"], arrangement });
    expect(tileIds(target)).toEqual(["a", "b", "c"]);

    target.querySelector<HTMLButtonElement>("button.shuffle")?.click();
    flushSync();

    expect(arrangement.state.order).not.toEqual(["a", "b", "c"]);
    expect(tileIds(target)).toEqual(arrangement.state.order);
  });

  it("moves the selected picture one place on with Later", () => {
    const arrangement = arrangementWith(["a", "b", "c"]);
    const { target } = mountStrip({ ids: ["a", "b", "c"], arrangement });

    tiles(target)[0]?.click();
    flushSync();
    const later = [...target.querySelectorAll('[role="toolbar"] button')].find(
      (button) => text(button) === "Später",
    );
    (later as HTMLButtonElement | undefined)?.click();
    flushSync();

    expect(tileIds(target)).toEqual(["b", "a", "c"]);
  });
});
