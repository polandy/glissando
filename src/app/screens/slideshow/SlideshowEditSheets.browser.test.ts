import { flushSync, mount, unmount } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { NO_SONG_BEATS } from "../../../compose/playlist";
import type { PortraitPictures } from "../../../library/portrait-pictures";
import { FakeClock, FakeFrameScheduler } from "../../../player/testing/fakes";
import { appContext } from "../../app-context";
import { createTranslator } from "../../i18n/translator";
import { Navigator } from "../../navigation/navigator";
import { FakeHistory } from "../../testing/fake-history";
import { details } from "../slideshow-screen-harness";
import { moodPreviewPortsFixture } from "./mood-preview-ports-fixture";
import {
  slideshowEditCommandsContext,
  type SlideshowEditCommands,
} from "./slideshow-edit-commands";
import { SlideshowSheets, type OpenSheet } from "./slideshow-sheets.svelte";
import SlideshowEditSheets from "./SlideshowEditSheets.svelte";

const unused = () => {
  throw new Error("not called in these tests");
};

const UNUSED_COMMANDS: SlideshowEditCommands = {
  onTransition: unused,
  onResetTransition: unused,
  onLook: unused,
  onResetLook: unused,
  onMood: unused,
  onResetMood: unused,
  onEnergyPacing: unused,
  onPortraitPictures: unused,
  onResetPortraitPictures: unused,
  onEnsureOpeningCard: unused,
  onOpeningCard: unused,
  onRemoveOpeningCard: unused,
  onEnsureClosingCard: unused,
  onClosingCard: unused,
  onRemoveClosingCard: unused,
};

let destroy = () => {};

afterEach(() => {
  destroy();
  destroy = () => {};
});

function mountSheets(commands: SlideshowEditCommands | null = UNUSED_COMMANDS) {
  const target = document.createElement("div");
  document.body.append(target);
  destroy = () => target.remove();
  const closed: OpenSheet[] = [];
  const sheets = new SlideshowSheets((sheet) => closed.push(sheet));
  const context = appContext({ current: createTranslator("de") }, new Navigator(new FakeHistory()));
  const instance = mount(SlideshowEditSheets, {
    target,
    props: {
      sheets,
      slideshow: details(["a"]),
      previewPorts: { clock: new FakeClock(), frames: new FakeFrameScheduler() },
      reducedMotion: true,
      moodPreviewPorts: moodPreviewPortsFixture(),
      moodBpm: undefined,
      moodBeats: NO_SONG_BEATS,
      chapterEditor: null,
    },
    context:
      commands === null
        ? context
        : new Map([...context, ...slideshowEditCommandsContext(commands)]),
  });
  flushSync();
  destroy = () => {
    void unmount(instance);
    target.remove();
  };
  return { target, sheets, closed };
}

describe("SlideshowEditSheets", () => {
  it("shows the sheet the state names, and only that one", () => {
    const { target, sheets } = mountSheets();

    sheets.open({ kind: "look" });
    flushSync();
    expect(target.querySelectorAll("dialog")).toHaveLength(1);

    sheets.open({ kind: "portraitPictures" });
    flushSync();

    const open = target.querySelectorAll("dialog");
    expect(open).toHaveLength(1);
    expect(open[0]?.getAttribute("aria-labelledby")).toBe("portrait-pictures-title");
  });

  it("closes through the state, handing back the sheet that closed", () => {
    const { target, sheets, closed } = mountSheets();
    sheets.open({ kind: "look" });
    flushSync();
    const done = [...target.querySelectorAll<HTMLButtonElement>("dialog button")].find(
      (button) => button.textContent.trim() === "Fertig",
    );
    expect(done).toBeDefined();

    done?.click();
    flushSync();

    expect(closed).toEqual([{ kind: "look" }]);
    expect(target.querySelector("dialog")).toBeNull();
  });

  it("stores a pick through the edit commands in context", () => {
    const picked: PortraitPictures[] = [];
    const { target, sheets } = mountSheets({
      ...UNUSED_COMMANDS,
      onPortraitPictures: (choice) => picked.push(choice),
    });
    sheets.open({ kind: "portraitPictures" });
    flushSync();
    const other = target.querySelector<HTMLElement>('dialog [role="radio"][aria-checked="false"]');
    expect(other).not.toBeNull();

    other?.click();

    expect(picked).toHaveLength(1);
  });

  it("refuses to mount without edit commands in context", () => {
    expect(() => mountSheets(null)).toThrow(/no slideshow edit commands in context/);
  });
});
