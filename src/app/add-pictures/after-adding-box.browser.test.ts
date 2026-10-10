import { afterEach, describe, expect, it } from "vitest";
import { createTranslator } from "../i18n/translator";
import { mountWithTranslator } from "../testing/mount-with-translator";
import type { AfterAdding } from "./after-adding";
import AfterAddingBox from "./AfterAddingBox.svelte";

const de = createTranslator("de");

let destroy: (() => void) | null = null;
afterEach(() => {
  destroy?.();
  destroy = null;
});

const SHARING: AfterAdding = {
  pictures: { before: 24, after: 32 },
  durationSeconds: { before: 340, after: 340 },
  perPictureSeconds: { before: 14.2, after: 10.6 },
  note: { kind: "sharesMusic" },
  placement: null,
};

function mountBox(after: AfterAdding): HTMLElement {
  const mounted = mountWithTranslator(AfterAddingBox, { after });
  destroy = mounted.destroy;
  return mounted.target;
}

const rows = (target: HTMLElement): string[] =>
  [...target.querySelectorAll("dl > div")].map((row) => row.textContent.replace(/\s+/g, " "));

const beforeAfter = (before: string, after: string): string =>
  de.t("add.beforeAfter", { before, after });

describe("AfterAddingBox", () => {
  it("shows pictures, duration and the share per picture before and after", () => {
    const target = mountBox(SHARING);

    expect(rows(target)).toEqual([
      `Bilder ${beforeAfter("24", "32")}`,
      `Dauer ${beforeAfter(de.formatDuration(340), de.formatDuration(340))}`,
      `Pro Bild ${beforeAfter(de.formatTenthSeconds(14.2), de.formatTenthSeconds(10.6))}`,
    ]);
  });

  it("leaves the per-picture row out when there is no share to compare", () => {
    const target = mountBox({ ...SHARING, perPictureSeconds: null });

    expect(rows(target).map((row) => row.split(" ")[0])).toEqual(["Bilder", "Dauer"]);
  });

  it.each([
    {
      note: "sharesMusic",
      after: SHARING,
      expected: de.t("add.sharesMusic"),
    },
    {
      note: "noMusic",
      after: { ...SHARING, note: { kind: "noMusic", secondsPerPicture: 5 } } as const,
      expected: de.t("add.noMusic", { seconds: de.formatSeconds(5) }),
    },
    {
      note: "musicTooShort",
      after: {
        ...SHARING,
        durationSeconds: { before: 340, after: 448 },
        note: { kind: "musicTooShort", musicSeconds: 340 },
      } as const,
      expected: `${de.t("add.musicTooShort")} ${de.t("add.musicTooShortText", {
        seconds: de.formatSeconds(2),
        total: de.formatDuration(448),
        music: de.formatDuration(340),
      })}`,
    },
  ])("says $note with its figures", ({ after, expected }) => {
    const target = mountBox(after);

    const note = target.querySelector(".note, .notice .text");
    expect(note?.textContent.replace(/\s+/g, " ").trim()).toBe(expected);
  });
});
