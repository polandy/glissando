import { describe, expect, it } from "vitest";
import type { StoredCard, StoredSlideshow } from "../library/stored-slideshow";
import { CARD_FONT_FILES } from "../player/card-fonts";
import { PAGE_CONTENT_SECURITY_POLICY } from "../html-export/page";
import { filePageLanguages } from "../app/file-page/file-page-languages";
import { FILE_WORDS_BLOCK_ID, readFileWords } from "./file-page-words";
import { type FilePageBundle, filePageHtml } from "./file-page-html";

const SCRIPT = "window.played = true;";

const bundle: FilePageBundle = {
  script: SCRIPT,
  style: "body{margin:0}",
  captionFontDataUrl: "data:font/woff2;base64,Q0FQVElPTg==",
  cardFontDataUrls: Object.fromEntries(
    CARD_FONT_FILES.map((file) => [file.assetPath, `data:font/woff2;base64,${file.family}`]),
  ),
  languages: filePageLanguages(),
};

const slideshow: StoredSlideshow = {
  id: "show-1",
  title: "Herbst <in> Wien",
  createdAt: "2025-10-01T08:00:00.000Z",
  pictures: [],
  songs: [],
  secondsPerPicture: 5,
};

const card = (style: StoredCard["style"], title = "Herbst"): StoredCard => ({
  title,
  style,
  position: "centre",
  entrance: "rise",
  background: { kind: "colour", colour: "plum" },
  motion: false,
});

const wordsIn = (html: string): string | null =>
  new RegExp(`id="${FILE_WORDS_BLOCK_ID}">(.*?)</script>`).exec(html)?.[1] ?? null;

describe("filePageHtml", () => {
  it("allows the page to read its own folder on top of the export page's policy", () => {
    const html = filePageHtml(bundle, slideshow);
    expect(html).toContain(`content="${PAGE_CONTENT_SECURITY_POLICY}; connect-src 'self'"`);
  });

  it("carries both languages' words for the script to read", () => {
    const html = filePageHtml(bundle, slideshow);
    expect(readFileWords(wordsIn(html))).toEqual(bundle.languages);
  });

  it("names the slideshow, escaped, and ends with the script", () => {
    const html = filePageHtml(bundle, slideshow);
    expect(html).toContain("<title>Herbst &lt;in&gt; Wien</title>");
    expect(html.trimEnd()).toMatch(/<script>window\.played = true;<\/script>\n<\/body>\n<\/html>$/);
  });

  it("embeds the caption font and only the card fonts its shown cards use", () => {
    const plain = filePageHtml(bundle, slideshow);
    expect(plain).toContain("Q0FQVElPTg==");
    expect(plain).not.toContain("Bricolage");

    const withCards = filePageHtml(bundle, {
      ...slideshow,
      openingCard: card("modern"),
      closingCard: card("classic", ""),
    });
    expect(withCards).toContain("data:font/woff2;base64,Bricolage");
    expect(withCards).not.toContain("Instrument Serif");
  });

  it("refuses a script that cannot be inlined unchanged", () => {
    expect(() => filePageHtml({ ...bundle, script: "a = '</script>';" }, slideshow)).toThrow();
  });
});
