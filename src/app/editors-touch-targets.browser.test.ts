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

    expect(touchTargetViolations(document.body)).toEqual([]);
  });

  it("gives every control of the music editor a 44 px square", () => {
    mountMusicEditor();

    expect(touchTargetViolations(document.body)).toEqual([]);
  });
});
