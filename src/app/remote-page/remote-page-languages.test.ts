import { describe, expect, it } from "vitest";
import { de } from "../i18n/catalogue-de";
import { en } from "../i18n/catalogue-en";
import { remotePageLanguages } from "./remote-page-languages";

describe("remotePageLanguages", () => {
  it("takes the remote page's words from each language's catalogue", () => {
    const languages = remotePageLanguages();

    expect(languages.de.showing).toBe(de["remotePage.showing"]);
    expect(languages.en.endedTitle).toBe("This remote has ended");
    expect(languages.en.play).toBe(en["htmlPage.play"]);
    expect(languages.de.tryAgain).toBe(de["server.tryAgain"]);
  });

  it("leaves no word empty in either language", () => {
    for (const words of Object.values(remotePageLanguages())) {
      const empty = Object.entries(words).filter(([, word]) => word === "");
      expect(empty).toEqual([]);
    }
  });
});
