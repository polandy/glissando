import { afterEach, describe, expect, it } from "vitest";
import type { AudioCodecChoice } from "../../../../video-export";
import { createTranslator } from "../../../i18n/translator";
import { mountWithTranslator } from "../../../testing/mount-with-translator";
import ExportChoose from "./ExportChoose.svelte";

const de = createTranslator("de");

let destroy = () => {};
afterEach(() => destroy());

function mountChoose(audioCodec: AudioCodecChoice | null) {
  const mounted = mountWithTranslator(ExportChoose, {
    view: {
      kind: "choose",
      available: ["720p", "1080p", "4k"],
      preset: "1080p",
      audioCodec,
      spaceShortage: null,
      starting: false,
    },
    estimate: () => 12_000_000,
    onSelect: () => {},
    onStart: () => {},
    onCancel: () => {},
  });
  destroy = mounted.destroy;
  return mounted.target;
}

function expectSheetReady(target: HTMLElement): void {
  expect(target.querySelectorAll('[role="radio"]')).toHaveLength(3);
  expect(target.textContent).toContain(de.t("videoExport.start"));
}

describe("the video sheet before the start", () => {
  it("has no Apple note when the sound is AAC", () => {
    const target = mountChoose("aac");

    expectSheetReady(target);
    expect(target.textContent).not.toContain(de.t("videoExport.appleNote"));
  });

  it("names the Apple devices once when the sound is Opus", () => {
    const target = mountChoose("opus");

    expectSheetReady(target);
    expect(target.textContent?.split(de.t("videoExport.appleNote"))).toHaveLength(2);
    expect(target.querySelector(".notice")).toBeNull();
  });

  it("lists no format chips", () => {
    const target = mountChoose("opus");

    expectSheetReady(target);
    expect(target.querySelector(".spec")).toBeNull();
    expect(target.textContent).not.toMatch(/H\.264|AAC|fps|Bilder\/s/);
  });

  it("puts the effort hint in the footer beside the buttons", () => {
    const target = mountChoose("aac");

    expectSheetReady(target);
    expect(target.querySelector("footer")?.textContent).toContain(de.t("videoExport.hint"));
  });
});
