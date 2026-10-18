import { describe, expect, it } from "vitest";
import { readShareWords, PageWordsError } from "./read-share-words";
import type { SharePageWords } from "./share-page-words";

const WORD_KEYS = [
  "eyebrow",
  "summary",
  "withMusic",
  "withoutMusic",
  "madeWith",
  "play",
  "pause",
  "mute",
  "unmute",
  "fullScreen",
  "timeline",
  "playAgain",
  "cannotPlay",
  "loadingFirst",
  "loadingLate",
  "goneTitle",
  "goneText",
  "unreachableTitle",
  "unreachableText",
  "tryAgain",
  "noscript",
  "appName",
  "tvPairTitle",
  "tvPairText",
  "tvAllowSound",
  "tvSoundAllowed",
  "tvConnectedTitle",
  "tvConnectedText",
  "tvEndedTitle",
  "tvEndedText",
  "tvUnreachableTitle",
  "tvUnreachableText",
  "tvControlWithPhone",
  "tvScanToControl",
  "tvQrCode",
  "tvNotePlaying",
  "tvNotePaused",
  "tvNoteNext",
  "tvNotePrevious",
  "tvNoteVolume",
];

function words(language: string): Record<string, unknown> {
  return {
    ...Object.fromEntries(WORD_KEYS.map((key) => [key, `${language} ${key}`])),
    pictures: { one: `${language} picture`, other: `${language} pictures` },
  };
}

describe("readShareWords", () => {
  it("reads both languages' words from the page's block", () => {
    const read = readShareWords(JSON.stringify({ de: words("de"), en: words("en") }));

    expect(read.de.goneTitle).toBe("de goneTitle");
    expect(read.en.pictures).toEqual({ one: "en picture", other: "en pictures" });
  });

  it.each([
    { what: "no block", text: null },
    { what: "no JSON", text: "{" },
    { what: "a language missing", text: JSON.stringify({ de: words("de") }) },
    {
      what: "a word missing",
      text: JSON.stringify({ de: words("de"), en: { ...words("en"), tryAgain: undefined } }),
    },
    {
      what: "a plural that is no plural",
      text: JSON.stringify({ de: words("de"), en: { ...words("en"), pictures: "pictures" } }),
    },
  ])("refuses $what", ({ text }) => {
    expect(() => readShareWords(text)).toThrow(PageWordsError);
  });

  it("keeps the type's keys and the read keys in step", () => {
    const read: SharePageWords = readShareWords(
      JSON.stringify({ de: words("de"), en: words("en") }),
    ).en;

    expect(Object.keys(read).sort()).toEqual([...WORD_KEYS, "pictures"].sort());
  });
});
