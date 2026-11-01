import "../../styles/tokens.css";
import "../../styles/base.css";
import { flushSync } from "svelte";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page, server } from "vitest/browser";
import { createMemoryStorage } from "../testing/memory-storage";
import { emulateCoarsePointer } from "../testing/coarse-pointer";
import { touchTargetViolations } from "../testing/touch-target";
import { createStorageFineSettingsFoldStore } from "./slideshow/fine-settings-fold";
import {
  details,
  mountScreen,
  selectionBar,
  tile,
  unmountScreen,
} from "./slideshow-screen-harness";

/** Firefox and WebKit cannot turn a coarse pointer on per test; Chromium can. */
const canEmulate = server.browser === "chromium";
const PHONE = { width: 390, height: 844 };
const THEMES = ["light", "dark"] as const;

/**
 * Controls known to be under 44 px, each owned by a file this change does not touch; the entry
 * is the line `touchTargetViolations` reports, up to the measured size. Remove an entry when its
 * file is fixed: a test fails on an entry that no longer applies.
 */
const KNOWN: readonly string[] = [
  // FineSettings.svelte: the fold's toggle is a full-width row 18 px high.
  'button.toggle "Weitere Einstellungen"',
];
/** Panel tiles that leave the screen instead of opening a sheet. */
const TILES_WITHOUT_SHEET = ["music"];

beforeEach(async () => {
  await page.viewport(PHONE.width, PHONE.height);
  await emulateCoarsePointer(true);
});
afterEach(async () => {
  unmountScreen();
  document.documentElement.removeAttribute("data-theme");
  await emulateCoarsePointer(false);
});

/** What the page reports, minus what is known; the known ones must still be reported. */
function unexpected(root: ParentNode): string[] {
  return touchTargetViolations(root).filter(
    (line) => !KNOWN.some((known) => line.startsWith(known)),
  );
}

const openDialog = () => document.querySelector<HTMLDialogElement>("dialog[open]");

/** Opens a panel tile's sheet and returns it. */
function openSheet(tileButton: HTMLButtonElement): HTMLDialogElement {
  tileButton.click();
  flushSync();
  const sheet = openDialog();
  if (sheet === null) throw new Error(`no sheet opened for ${tileButton.className}`);
  return sheet;
}

describe.skipIf(!canEmulate).each(THEMES)("SlideshowScreen touch targets, %s theme", (theme) => {
  beforeEach(() => document.documentElement.setAttribute("data-theme", theme));

  it("gives every control of the screen a 44 px square", () => {
    mountScreen(details(["a", "b", "c"]), {
      fineSettingsFold: createStorageFineSettingsFoldStore(
        createMemoryStorage({ "glissando.fineSettingsFold": "open" }),
      ),
    });

    expect(unexpected(document.body)).toEqual([]);
    const reported = touchTargetViolations(document.body);
    for (const known of KNOWN) {
      expect(
        reported.some((line) => line.startsWith(known)),
        `${known} is fixed`,
      ).toBe(true);
    }
  });

  it("gives every control of the selection bar a 44 px square", () => {
    mountScreen();
    tile(2, "02.07.2025").click();
    flushSync();
    const bar = selectionBar();
    if (bar === null) throw new Error("the selection bar did not open");

    expect(unexpected(bar)).toEqual([]);
  });

  it("gives every control of every panel sheet a 44 px square", () => {
    mountScreen(details(["a", "b", "c"]));
    const tiles = [...document.querySelectorAll<HTMLButtonElement>(".tiles button.tile")];
    expect(tiles.length).toBeGreaterThan(0);

    const found: string[] = [];
    for (const panelTile of tiles) {
      if (TILES_WITHOUT_SHEET.some((name) => panelTile.classList.contains(name))) continue;
      const sheet = openSheet(panelTile);
      found.push(...unexpected(sheet).map((line) => `[${panelTile.classList[1]}] ${line}`));
      sheet.close();
      flushSync();
    }

    expect(found).toEqual([]);
  });
});
