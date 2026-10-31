import { describe, expect, it } from "vitest";
import { en } from "./catalogue-en";
import { enFilePage } from "./catalogue-en-file-page";
import { enHtml } from "./catalogue-en-html";
import { enSharePage } from "./catalogue-en-share-page";
import { enVideo } from "./catalogue-en-video";

/** Banned variants from the "Not" column of dev-docs/COPY.md, with the glossary word to use. */
const BANNED: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bmedia\b/i, "pictures"],
  [/\bphotos?\b/i, "pictures"],
  [/\bfilm\b/i, "slideshow"],
  [/\bthe show\b/i, "slideshow"],
  [/\b(track|tracks|soundtrack|playlist)\b/i, "song / music"],
  [/\bDefault\b/i, "Automatic"],
  [/\b(Custom|Own choice)\b|\bown choice\b/i, "Automatic"],
  [/\bDiscard\b/, "Remove"],
  [/\bClear\b/, "Remove"],
  [/\bExport(ing|ed)?\b/i, "Share / Save"],
  [/\bbackend\b/i, "Glissando server"],
  [/\bdownsiz/i, "downscaled"],
  [/\bFullscreen\b/, "Full screen"],
  [/\bTrimmed\b/, "Excerpt"],
  [/\bFine settings\b/, "More settings"],
  [/\bKen Burns\b/i, "motion"],
  [/\bBPM\b/, "beat"],
  [/\bdB\b/, "plain words"],
  [/^Cut$/, "Hard cut"],
  [/^(Own|Duration)$|\bpicture times\b/i, "Automatic / Picture length"],
  [/levelled/i, "Same volume as the other songs"],
  [/distortion/i, "dropped"],
];

// The Video, Web page, Share page and file page sheets and the settings keys belong to package P4.
const OWNED_BY_P4 = new Set<string>([
  ...Object.keys(enVideo),
  ...Object.keys(enHtml),
  ...Object.keys(enSharePage),
  ...Object.keys(enFilePage),
]);

/** Keys a pattern may not judge: "Film" is a look's name, and the two decibel keys show a measured number with its unit. */
const EXEMPT = new Set<string>(["look.film", "units.decibels", "music.volumeHintCappedShort"]);

/** Placeholder names such as {track} are code, not copy. */
const strings = (value: unknown): string[] =>
  (typeof value === "string" ? [value] : Object.values(value as Record<string, string>)).map(
    (text) => text.replace(/\{\w+\}/g, ""),
  );

describe("English catalogue against the glossary", () => {
  const hits: string[] = [];
  for (const [key, value] of Object.entries(en)) {
    if (OWNED_BY_P4.has(key) || key.startsWith("settings.") || EXEMPT.has(key)) continue;
    for (const text of strings(value)) {
      for (const [pattern, use] of BANNED) {
        if (pattern.test(text)) hits.push(`${key}: ${pattern} (use ${use}) in "${text}"`);
      }
    }
  }

  it("uses no banned variant", () => {
    expect(hits).toEqual([]);
  });
});
