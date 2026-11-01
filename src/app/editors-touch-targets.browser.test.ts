import "../styles/tokens.css";
import "../styles/base.css";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page, server } from "vitest/browser";
import {
  mountEditor as mountMusicEditor,
  unmountEditor as unmountMusic,
} from "./music-editor/music-editor-harness";
import {
  mountEditor as mountPictureEditor,
  unmountEditor as unmountPicture,
} from "./picture-editor/picture-editor-harness";
import { emulateCoarsePointer } from "./testing/coarse-pointer";
import { touchTargetViolations } from "./testing/touch-target";

/** Firefox and WebKit cannot turn a coarse pointer on per test; Chromium can. */
const canEmulate = server.browser === "chromium";
const PHONE = { width: 390, height: 844 };
const THEMES = ["light", "dark"] as const;

/**
 * Controls known to be under 44 px: each is styled by its editor's own component, not by a
 * shared class. An entry is a line `touchTargetViolations` reports, up to the size; a test fails
 * on an entry that is fixed, so the list only shrinks.
 */
const KNOWN_PICTURE_EDITOR: readonly string[] = [
  'div.frame.active "Startrahmen',
  'button.chip "Start"',
  'button.chip "Endrahmen bearbeiten"',
  'button.action "Jetzt ansehen"',
  'button "Rahmen"',
  'button "Abspielen"',
  'button "Start"',
  'button "Ende"',
  'button.btn.small "Start und Ende tauschen"',
  'button.btn.small.ghost "Zurück auf automatisch"',
  'input.field ""',
  'button "Eine halbe Sekunde kürzer"',
  'button "Eine halbe Sekunde länger"',
  'input ""',
];
/**
 * The music editor's own controls all pass. What remains comes from `SecondsStepper`, which
 * belongs to the picture editor's package (P8) and shrinks the same way there.
 */
const KNOWN_MUSIC_EDITOR: readonly string[] = [
  'button "Anfang eine halbe Sekunde früher"',
  'button "Anfang eine halbe Sekunde später"',
  'button "Ende eine halbe Sekunde früher"',
  'button "Ende eine halbe Sekunde später"',
];

/** What is reported besides the known; every known entry must still be reported. */
function unexpected(known: readonly string[]): string[] {
  const reported = touchTargetViolations(document.body);
  for (const entry of known) {
    expect(
      reported.some((line) => line.startsWith(entry)),
      `${entry} is fixed: remove it from the list`,
    ).toBe(true);
  }
  return reported.filter((line) => !known.some((entry) => line.startsWith(entry)));
}

beforeEach(async () => {
  await page.viewport(PHONE.width, PHONE.height);
  await emulateCoarsePointer(true);
});
afterEach(async () => {
  unmountPicture();
  unmountMusic();
  document.documentElement.removeAttribute("data-theme");
  await emulateCoarsePointer(false);
});

describe.skipIf(!canEmulate).each(THEMES)("editor touch targets, %s theme", (theme) => {
  beforeEach(() => document.documentElement.setAttribute("data-theme", theme));

  it("gives every control of the picture editor a 44 px square", () => {
    mountPictureEditor();

    expect(unexpected(KNOWN_PICTURE_EDITOR)).toEqual([]);
  });

  it("gives every control of the music editor a 44 px square", () => {
    mountMusicEditor();

    expect(unexpected(KNOWN_MUSIC_EDITOR)).toEqual([]);
  });
});
