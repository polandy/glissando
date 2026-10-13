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

  it("offers the app's own Erneut versuchen when the server isn't answering", () => {
    const languages = sharePageLanguages();

    expect(languages.de.tryAgain).toBe("Erneut versuchen");
    expect(languages.en.tryAgain).toBe(en["server.tryAgain"]);
  });

  it("brings the TV page's words, its wordmark the app's name", () => {
    const languages = sharePageLanguages();

    expect(languages.en.tvPairTitle).toBe(en["tvPage.pairTitle"]);
    expect(languages.de.tvNoteVolume).toBe(de["tvPage.noteVolume"]);
    expect(languages.de.appName).toBe(de["app.name"]);
  });

  it("leaves no word empty in either language", () => {
    for (const words of Object.values(sharePageLanguages())) {
      const empty = Object.entries(words).filter(([, word]) => word === "");
      expect(empty).toEqual([]);
    }
  });
});
