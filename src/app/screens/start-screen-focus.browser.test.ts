import { createRawSnippet, flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { SlideshowSearch } from "../../library/focus-pass";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { reactiveProps } from "../testing/reactive-props.svelte";
import StartScreen from "./StartScreen.svelte";
import type { SlideshowSummary } from "./view-models";

// A transparent pixel stands in for the covers.
const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const summary = (id: string, title: string): SlideshowSummary => ({
  id,
  title,
  coverUrls: [PIXEL],
  pictureCount: 40,
  durationSeconds: 200,
  hasMusic: false,
});

let destroy = () => {};
afterEach(() => destroy());

function mountStart(focusSearches: ReadonlyMap<string, SlideshowSearch>) {
  const opened: string[] = [];
  const props = reactiveProps({
    slideshows: [summary("lake", "Sommer am See"), summary("hike", "Wanderung Allgäu")],
    focusSearches,
    onCreate: () => {},
    onOpen: (slideshowId: string) => opened.push(slideshowId),
    onSettings: () => {},
    onOpenFile: () => {},
    notice: null,
    onDismissNotice: () => {},
    onReload: () => {},
    statusBar: createRawSnippet(() => ({ render: () => "<footer></footer>" })),
  });
  const mounted = mountWithTranslator(StartScreen, props);
  destroy = mounted.destroy;
  return { target: mounted.target, props, opened };
}

const card = (target: HTMLElement, title: string): HTMLButtonElement => {
  const found = [...target.querySelectorAll<HTMLButtonElement>("button.show")].find((button) =>
    button.textContent?.includes(title),
  );
  if (found === undefined) {
    throw new Error(`no card for "${title}"`);
  }
  return found;
};

describe("StartScreen, the background search for subjects", () => {
  it("tells on a slideshow's card how far the search is, with a progress hairline", () => {
    const { target } = mountStart(new Map([["lake", { done: 12, total: 40 }]]));

    const lake = card(target, "Sommer am See");
    expect(lake.textContent).toContain("Motive werden gesucht · 12 von 40");
    const bar = lake.querySelector('[role="progressbar"]');
    expect(bar?.getAttribute("aria-valuenow")).toBe("12");
    expect(bar?.getAttribute("aria-valuemax")).toBe("40");
    expect(card(target, "Wanderung Allgäu").textContent).not.toContain("Motive");
  });

  it("keeps a searched slideshow's card usable", () => {
    const { target, opened } = mountStart(new Map([["lake", { done: 12, total: 40 }]]));

    card(target, "Sommer am See").click();

    expect(opened).toEqual(["lake"]);
  });

  it("drops the line once the search is done with the slideshow", () => {
    const { target, props } = mountStart(new Map([["lake", { done: 39, total: 40 }]]));

    props.focusSearches = new Map();
    flushSync();

    expect(card(target, "Sommer am See").textContent).toContain("40 Bilder");
    expect(card(target, "Sommer am See").querySelector('[role="progressbar"]')).toBeNull();
  });
});
