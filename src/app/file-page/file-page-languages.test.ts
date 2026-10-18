import { describe, expect, it } from "vitest";
import { readFileWords } from "../../file-page/file-page-words";
import { de } from "../i18n/catalogue-de";
import { en } from "../i18n/catalogue-en";
import { filePageLanguages } from "./file-page-languages";

describe("filePageLanguages", () => {
  it("takes index.html's words from each language's catalogue", () => {
    const languages = filePageLanguages();

    expect(languages.de.chooseFolder).toBe(de["filePage.chooseFolder"]);
    expect(languages.en.missing).toBe(en["filePage.missing"]);
    expect(languages.en.eyebrow).toBe(en["htmlPage.eyebrow"]);
    expect(languages.de.pictures).toEqual(de["units.pictures"]);
  });

  it("leaves no word empty in either language", () => {
    for (const words of Object.values(filePageLanguages())) {
      const empty = Object.entries(words).filter(([, word]) => word === "");
      expect(empty).toEqual([]);
    }
  });

  it("reads back from the page's words block as it was built", () => {
    const languages = filePageLanguages();

    expect(readFileWords(JSON.stringify(languages))).toEqual(languages);
  });
});
