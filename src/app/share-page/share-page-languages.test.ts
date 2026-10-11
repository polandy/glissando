import { describe, expect, it } from "vitest";
import { de } from "../i18n/catalogue-de";
import { en } from "../i18n/catalogue-en";
import { sharePageLanguages } from "./share-page-languages";

describe("sharePageLanguages", () => {
  it("takes the share page's words from each language's catalogue", () => {
    const languages = sharePageLanguages();

    expect(languages.de.eyebrow).toBe(de["sharePage.eyebrow"]);
    expect(languages.en.goneTitle).toBe(en["sharePage.goneTitle"]);
    expect(languages.en.play).toBe(en["htmlPage.play"]);
    expect(languages.de.pictures).toEqual(de["units.pictures"]);
  });

  it("leaves no word empty in either language", () => {
    for (const words of Object.values(sharePageLanguages())) {
      const empty = Object.entries(words).filter(([, word]) => word === "");
      expect(empty).toEqual([]);
    }
  });
});
