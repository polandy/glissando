import { describe, expect, it } from "vitest";
import { createTranslator } from "../app/i18n/translator";
import { SAMPLE_MUSIC_CREDIT } from "./sample-music-credit";

describe("SAMPLE_MUSIC_CREDIT", () => {
  it("resolves to the German credit text", () => {
    expect(createTranslator("de").t(SAMPLE_MUSIC_CREDIT)).toBe("Musik: Glissando, CC BY-NC 4.0");
  });

  it("resolves to the English credit text", () => {
    expect(createTranslator("en").t(SAMPLE_MUSIC_CREDIT)).toBe("Music: Glissando, CC BY-NC 4.0");
  });
});
