import { afterEach, describe, expect, it } from "vitest";
import { createTranslator } from "../i18n/translator";
import { mountWithTranslator } from "../testing/mount-with-translator";
import PictureLengthNotice from "./PictureLengthNotice.svelte";
import type { NoticeInput } from "./picture-length-notice";

let unmounts: (() => void)[] = [];
afterEach(() => {
  for (const unmount of unmounts) unmount();
  unmounts = [];
});

const base: NoticeInput = {
  playlistMs: 60_000,
  slideshowMs: 60_000,
  repeatMusic: false,
};

function mount(playlist: NoticeInput, onRepeatMusic: (value: true | undefined) => void = () => {}) {
  const mounted = mountWithTranslator(
    PictureLengthNotice,
    { playlist, onRepeatMusic },
    { current: createTranslator("en") },
  );
  unmounts.push(mounted.destroy);
  return mounted.target;
}

const line = (target: HTMLElement) => target.querySelector(".length-notice");

describe("PictureLengthNotice", () => {
  it("says the slideshow ends with the music", () => {
    expect(line(mount(base))?.textContent).toContain("ends with the music");
  });

  it("says the share the pictures shrank to", () => {
    const target = mount({ ...base, fittedShareMs: 3_300 });

    expect(line(target)?.textContent).toContain("Shortened to 3.3");
  });

  it("says the music repeats", () => {
    const target = mount({ ...base, slideshowMs: 120_000, repeatMusic: true });

    expect(line(target)?.textContent).toContain("repeats");
  });

  it("says the music fades out when the slideshow is shorter than the music", () => {
    const target = mount({ ...base, playlistMs: 120_000 });

    expect(line(target)?.textContent).toContain("fades out");
  });

  it("states a small gap neutrally, with one Repeat the music link and no add link", () => {
    const calls: (true | undefined)[] = [];
    const target = mount({ ...base, slideshowMs: 70_000, overMs: 10_000 }, (v) => calls.push(v));

    expect(line(target)?.textContent).toContain("The music ends 0:10 before the pictures.");
    expect(line(target)?.classList.contains("warning")).toBe(false);
    const buttons = target.querySelectorAll("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.textContent).toContain("Repeat the music");
    buttons[0]?.click();
    expect(calls).toEqual([true]);
  });

  it("tints a gap larger than a third of the slideshow as a warning", () => {
    const target = mount({ ...base, slideshowMs: 90_000, overMs: 40_000 });

    expect(line(target)?.classList.contains("warning")).toBe(true);
  });
});
