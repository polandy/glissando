import { describe, expect, it } from "vitest";
import {
  readRemoteWords,
  REMOTE_TEXT_KEYS,
  remoteLanguage,
  showLine,
  RemoteWordsError,
  type RemotePageWords,
} from "./remote-page-words";

const words = Object.fromEntries(REMOTE_TEXT_KEYS.map((key) => [key, key])) as RemotePageWords;
const english: RemotePageWords = {
  ...words,
  pictureOf: "Picture {number} of {count}",
  playing: "Playing",
  paused: "Paused",
  finished: "Finished",
};
const german: RemotePageWords = { ...english, pictureOf: "Bild {number} von {count}" };

describe("remoteLanguage", () => {
  it.each([
    ["de-DE", "de"],
    ["DE-at", "de"],
    ["en-US", "en"],
    ["fr", "en"],
  ])("speaks to a browser in %s in %s", (browser, language) => {
    expect(remoteLanguage(browser)).toBe(language);
  });
});

describe("showLine", () => {
  it.each([
    ["playing", "Picture 19 of 48 · Playing"],
    ["paused", "Picture 19 of 48 · Paused"],
    ["finished", "Picture 19 of 48 · Finished"],
  ] as const)("tells a slideshow %s", (playback, line) => {
    expect(showLine(english, "en", { pictureNumber: 19, pictureCount: 48, playback })).toBe(line);
  });

  it("writes numbers as the language does", () => {
    expect(
      showLine(german, "de", { pictureNumber: 1200, pictureCount: 4800, playback: "paused" }),
    ).toBe("Bild 1.200 von 4.800 · Paused");
  });
});

describe("readRemoteWords", () => {
  const block = JSON.stringify({ de: german, en: english });

  it("reads both languages", () => {
    expect(readRemoteWords(block)).toEqual({ de: german, en: english });
  });

  it.each([
    ["no block", null],
    ["no JSON", "{"],
    ["a language missing", JSON.stringify({ de: german })],
    ["a word missing", JSON.stringify({ de: german, en: { ...english, disconnect: undefined } })],
    ["a word that is no text", JSON.stringify({ de: german, en: { ...english, play: 1 } })],
  ])("refuses %s", (_name, text) => {
    expect(() => readRemoteWords(text)).toThrow(RemoteWordsError);
  });
});
