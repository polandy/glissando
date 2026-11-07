import { flushSync, mount, unmount } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { NO_SONG_BEATS } from "../../../compose/playlist";
import { FakeClock, FakeFrameScheduler } from "../../../player/testing/fakes";
import { appContext } from "../../app-context";
import { createTranslator } from "../../i18n/translator";
import { Navigator } from "../../navigation/navigator";
import { FakeHistory } from "../../testing/fake-history";
import { details } from "../slideshow-screen-harness";
import { moodPreviewPortsFixture } from "./mood-preview-ports-fixture";
import SlideshowEditSheets from "./SlideshowEditSheets.svelte";

const unused = () => {
  throw new Error("not called in these tests");
};

let destroy = () => {};

afterEach(() => {
  destroy();
  destroy = () => {};
});

function mountSheets() {
  const target = document.createElement("div");
  document.body.append(target);
  const sheets = mount(SlideshowEditSheets, {
    target,
    props: {
      slideshow: details(["a"]),
      previewPorts: { clock: new FakeClock(), frames: new FakeFrameScheduler() },
      reducedMotion: true,
      onTransition: unused,
      onResetTransition: unused,
      onLook: unused,
      onResetLook: unused,
      moodPreviewPorts: moodPreviewPortsFixture(),
      moodBpm: undefined,
      moodBeats: NO_SONG_BEATS,
      onMood: unused,
      onResetMood: unused,
      onEnergyPacing: unused,
      onPortraitPictures: unused,
      onResetPortraitPictures: unused,
      onTransitionsClosed: unused,
      onLookClosed: unused,
      onMoodClosed: unused,
      onPortraitPicturesClosed: unused,
      onEnsureOpeningCard: unused,
      onOpeningCard: unused,
      onRemoveOpeningCard: unused,
      onOpeningCardClosed: unused,
      onEnsureClosingCard: unused,
      onClosingCard: unused,
      onRemoveClosingCard: unused,
      onClosingCardClosed: unused,
      onChapterClosed: unused,
      chapterEditor: null,
    },
    context: appContext({ current: createTranslator("de") }, new Navigator(new FakeHistory())),
  });
  flushSync();
  destroy = () => {
    void unmount(sheets);
    target.remove();
  };
  return { target, sheets };
}

describe("SlideshowEditSheets", () => {
  it("keeps one sheet open at a time: opening another replaces it", () => {
    const { target, sheets } = mountSheets();

    sheets.openLook();
    flushSync();
    expect(target.querySelectorAll("dialog")).toHaveLength(1);

    sheets.openPortraitPictures();
    flushSync();

    const open = target.querySelectorAll("dialog");
    expect(open).toHaveLength(1);
    expect(open[0]?.getAttribute("aria-labelledby")).toBe("portrait-pictures-title");
  });
});
