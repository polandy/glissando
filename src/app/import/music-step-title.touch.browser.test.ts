import "../../styles/tokens.css";
import "../../styles/base.css";
import { afterEach, describe, expect, it } from "vitest";
import { server } from "vitest/browser";
import { titleForCaptureRange } from "../../compose";
import { emulateCoarsePointer } from "../testing/coarse-pointer";
import { mountMusicStep, titleField, type MusicStepRig } from "./testing/music-step-rig";
import { withTwoPictures } from "./testing/import-session-fixtures";

/** Touch emulation exists only through Chromium's DevTools protocol. */
const canTouch = server.browser === "chromium";

let rig: MusicStepRig | null = null;
afterEach(async () => {
  rig?.destroy();
  rig = null;
  if (canTouch) await emulateCoarsePointer(false);
});

// The fixture's pictures were taken on 2025-07-01 and 2025-08-02.
const SUMMER_TITLE = titleForCaptureRange(["2025-07-01T10:00:00Z", "2025-08-02T10:00:00Z"], "en");

describe("MusicStep, the Title field on a touch screen", () => {
  it.skipIf(!canTouch)("waits for a tap, so the keyboard does not cover the step", async () => {
    const { session } = await withTwoPictures();
    await emulateCoarsePointer(true);

    rig = mountMusicStep(session);
    const field = titleField(rig.target);

    expect(field.value).toBe(SUMMER_TITLE);
    expect(document.activeElement).toBe(document.body);
  });
});
