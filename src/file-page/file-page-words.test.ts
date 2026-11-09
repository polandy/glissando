import { describe, expect, it } from "vitest";
import { PageWordsError } from "../share-page/read-share-words";
import {
  folderProblemDetails,
  folderProblemText,
  readFileWords,
  type FilePageWords,
} from "./file-page-words";

const WORDS: FilePageWords = {
  eyebrow: "Slideshow",
  summary: "{pictures} · {duration} · {music}",
  pictures: { one: "{count} picture", other: "{count} pictures" },
  withMusic: "with music",
  withoutMusic: "without music",
  madeWith: "Made with Glissando",
  sampleMusicCredit: "Music: Glissando, CC BY-NC 4.0",
  play: "Play",
  pause: "Pause",
  mute: "Mute",
  unmute: "Unmute",
  fullScreen: "Full screen",
  timeline: "Timeline",
  playAgain: "Play again",
  cannotPlay: "Cannot play",
  noscript: "Needs JavaScript",
  chooseTitle: "Choose the folder",
  chooseText: "Pick it",
  chooseFolder: "Choose folder",
  noManifest: "No glissando.json",
  missing: "Lacks {files}.",
  damaged: "Broken",
  showDetails: "Show details",
  hideDetails: "Hide details",
  foreign: "Not a slideshow",
  newer: "Too new",
};

describe("folderProblemText", () => {
  it("names each missing file", () => {
    const text = folderProblemText(WORDS, {
      kind: "missing",
      files: ["pictures/0002.png", "music/track-1.m4a"],
    });

    expect(text).toBe("Lacks pictures/0002.png, music/track-1.m4a.");
  });

  it("keeps a damaged glissando.json's reason out of the sentence", () => {
    const problem = { kind: "damaged", reason: "no JSON at 1:2" } as const;

    expect(folderProblemText(WORDS, problem)).toBe("Broken");
    expect(folderProblemDetails(problem)).toBe("no JSON at 1:2");
  });

  it("has details for a damaged file only", () => {
    expect(folderProblemDetails({ kind: "noManifest" })).toBeNull();
    expect(folderProblemDetails({ kind: "missing", files: ["a"] })).toBeNull();
  });

  it("has its own words for no, a foreign and a newer glissando.json", () => {
    expect(folderProblemText(WORDS, { kind: "noManifest" })).toBe(WORDS.noManifest);
    expect(folderProblemText(WORDS, { kind: "foreign" })).toBe(WORDS.foreign);
    expect(folderProblemText(WORDS, { kind: "newer" })).toBe(WORDS.newer);
  });
});

describe("readFileWords", () => {
  it("refuses a words block lacking a word", () => {
    const lacking = Object.fromEntries(
      Object.entries(WORDS).filter(([key]) => key !== "chooseFolder"),
    );

    expect(() => readFileWords(JSON.stringify({ de: lacking, en: WORDS }))).toThrow(PageWordsError);
  });
});
