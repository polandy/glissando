import { describe, expect, it } from "vitest";
import { de } from "./catalogue-de";
import { en } from "./catalogue-en";
import { createTranslator, pickLanguage } from "./translator";

describe("pickLanguage", () => {
  it.each([
    [["de-DE", "en-US"], "de"],
    [["de"], "de"],
    [["DE-at"], "de"],
    [["en-GB", "de"], "en"],
    [["fr-FR", "de-CH"], "de"],
    [["fr-FR", "it"], "en"],
    [[], "en"],
  ] as const)(
    "picks %j as %s: the first supported browser language, English otherwise",
    (languages, expected) => {
      expect(pickLanguage(languages)).toBe(expected);
    },
  );
});

describe("translate", () => {
  it("returns the message of the chosen language", () => {
    expect(createTranslator("de").t("slideshow.play")).toBe("Abspielen");
    expect(createTranslator("en").t("slideshow.play")).toBe("Play");
  });

  it("fills placeholders", () => {
    expect(createTranslator("de").t("player.counter", { index: 3, total: 12 })).toBe("3 / 12");
  });

  it.each([
    ["de", 1, "1 Bild"],
    ["de", 12, "12 Bilder"],
    ["de", 0, "0 Bilder"],
    ["en", 1, "1 picture"],
    ["en", 12, "12 pictures"],
  ] as const)("in %s pluralises %d as %s", (language, count, expected) => {
    expect(createTranslator(language).t("units.pictures", { count })).toBe(expected);
  });

  it("formats numeric placeholders in the locale", () => {
    expect(createTranslator("de").t("units.pictures", { count: 1200 })).toBe("1.200 Bilder");
    expect(createTranslator("en").t("units.pictures", { count: 1200 })).toBe("1,200 pictures");
  });
});

describe("message types", () => {
  it("demand exactly the parameters a message has", () => {
    const { t } = createTranslator("en");
    // @ts-expect-error -- "player.counter" needs index and total
    expect(() => t("player.counter")).toThrow(/"index"/);
    // @ts-expect-error -- a plural needs its count
    expect(() => t("units.pictures", {})).toThrow(/"count"/);
    // @ts-expect-error -- "slideshow.play" has no placeholders
    expect(t("slideshow.play", { count: 1 })).toBe("Play");
    // @ts-expect-error -- unknown keys do not exist
    expect(() => t("slideshow.nope")).toThrow();
  });
});

describe("formatters", () => {
  it.each([
    [0, "0:00"],
    [9.9, "0:09"],
    [72, "1:12"],
    [600, "10:00"],
    [3725, "62:05"],
  ])("formats %d seconds as the duration %s", (seconds, expected) => {
    expect(createTranslator("de").formatDuration(seconds)).toBe(expected);
  });

  it.each([
    ["de", 4.5, "4,5 s"],
    ["en", 4.5, "4.5 s"],
    ["de", 5, "5 s"],
    ["de", 60 / 7, "8,6 s"],
  ] as const)("in %s formats %d seconds per picture as %s", (language, seconds, expected) => {
    expect(createTranslator(language).formatSeconds(seconds)).toBe(expected);
  });

  it.each([
    ["de", 1.2, "1,20×"],
    ["en", 2.345, "2.35×"],
    ["de", 3, "3,00×"],
  ] as const)("in %s formats the zoom %d as %s", (language, zoom, expected) => {
    expect(createTranslator(language).formatZoom(zoom)).toBe(expected);
  });

  it.each([
    ["de", 2.46, "0:02,4"],
    ["en", 2.46, "0:02.4"],
    ["de", 65, "1:05,0"],
  ] as const)("in %s formats %d seconds to the tenth as %s", (language, seconds, expected) => {
    expect(createTranslator(language).formatTenths(seconds)).toBe(expected);
  });

  it("formats a capture date as dd.mm.yyyy in UTC", () => {
    expect(createTranslator("de").formatDate("2025-07-12T23:30:00Z")).toBe("12.07.2025");
  });

  it("rejects a date it cannot read, naming the value", () => {
    expect(() => createTranslator("de").formatDate("yesterday")).toThrow(/"yesterday"/);
  });
});

describe("formatBytes", () => {
  it.each([
    ["de", 184_000_000, "184 MB"],
    ["de", 2_100_000_000, "2,1 GB"],
    ["en", 2_100_000_000, "2.1 GB"],
    ["en", 640_400_000, "640 MB"],
    ["en", 999_600_000, "1 GB"],
    ["en", 51, "1 MB"],
    ["en", 0, "0 MB"],
  ] as const)("in %s shows %d bytes as %j", (language, bytes, expected) => {
    expect(createTranslator(language).formatBytes(bytes)).toBe(expected);
  });
});

describe("catalogues", () => {
  function placeholdersOf(message: unknown): string[] {
    const text = typeof message === "string" ? message : JSON.stringify(message);
    return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? "").sort();
  }

  it("English uses the same placeholders as German in every message", () => {
    for (const key of Object.keys(de) as (keyof typeof de)[]) {
      expect(placeholdersOf(en[key]).filter(unique), key).toEqual(
        placeholdersOf(de[key]).filter(unique),
      );
    }
  });

  function unique(value: string, index: number, all: string[]): boolean {
    return all.indexOf(value) === index;
  }
});
