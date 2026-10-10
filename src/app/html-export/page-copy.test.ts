import { describe, expect, it } from "vitest";
import { createTranslator } from "../i18n/translator";
import { pageWords } from "./page-copy";

const SUBJECT = { title: "Sommer", durationMs: 250_000, withMusic: true, pictureCount: 50 };

describe("pageWords", () => {
  it("writes the page's words in the app's language, the summary already formatted", () => {
    const words = pageWords(createTranslator("de"), SUBJECT);

    expect(words.lang).toBe("de");
    expect(words.copy).toEqual({
      eyebrow: "Diashow",
      summary: "50 Bilder · 4:10 · mit Musik",
      madeWith: "Erstellt mit Glissando · läuft offline",
      play: "Abspielen",
      pause: "Pause",
      mute: "Ton aus",
      unmute: "Ton an",
      fullScreen: "Vollbild",
      timeline: "Zeitleiste",
      playAgain: "Nochmal abspielen",
      cannotPlay: "Diese Diashow lässt sich hier nicht abspielen.",
    });
    expect(words.noscript).toMatch(/^Diese Diashow braucht JavaScript\./);
  });

  it("names one picture in the singular and a slideshow without music as such", () => {
    const words = pageWords(createTranslator("en"), {
      ...SUBJECT,
      pictureCount: 1,
      withMusic: false,
      durationMs: 5_000,
    });

    expect(words.lang).toBe("en");
    expect(words.copy.summary).toBe("1 picture · 0:05 · without music");
  });
});
