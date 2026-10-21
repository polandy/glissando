import { describe, expect, it } from "vitest";
import { pageCopyFor, shareLanguage, type SharePageWords } from "./share-page-words";

const WORDS: SharePageWords = {
  eyebrow: "Shared slideshow",
  summary: "{pictures} · {duration} · {music}",
  pictures: { one: "{count} picture", other: "{count} pictures" },
  withMusic: "with music",
  withoutMusic: "without music",
  madeWith: "Shared with Glissando",
  play: "Play",
  pause: "Pause",
  mute: "Mute",
  unmute: "Unmute",
  fullScreen: "Full screen",
  timeline: "Timeline",
  playAgain: "Play again",
  cannotPlay: "This slideshow cannot play here.",
  loadingFirst: "Loading the first pictures …",
  loadingLate: "Loading",
  goneTitle: "This link doesn't work any more",
  goneText: "Ask them for a new one.",
  unreachableTitle: "Can't reach the slideshow right now",
  unreachableText: "Try again in a moment.",
  tryAgain: "Try again",
  noscript: "This slideshow needs JavaScript.",
  appName: "Glissando",
  tvPairTitle: "Show a slideshow here",
  tvPairText: "Scan the code, or type it.",
  tvAllowSound: "Allow sound",
  tvSoundAllowed: "Sound is allowed",
  tvConnectedTitle: "Phone connected",
  tvConnectedText: "Choose a slideshow on your phone.",
  tvEndedTitle: "That was “{title}”",
  tvEndedText: "Press “Play again” on your phone.",
  tvUnreachableTitle: "Can't reach the server",
  tvUnreachableText: "This page tries again by itself.",
  tvControlWithPhone: "Control with your phone",
  tvScanToControl: "Scan the code with your phone.",
  tvQrCode: "QR code for your phone",
  tvNotePlaying: "Playing",
  tvNotePaused: "Paused",
  tvNoteNext: "Next",
  tvNotePrevious: "Previous",
  tvNoteVolume: "Volume {percent}%",
};

describe("shareLanguage", () => {
  it.each([
    { browser: "de", language: "de" },
    { browser: "de-AT", language: "de" },
    { browser: "en-US", language: "en" },
    { browser: "fr-FR", language: "en" },
    { browser: "", language: "en" },
  ])("speaks $language to a browser in $browser", ({ browser, language }) => {
    expect(shareLanguage(browser)).toBe(language);
  });
});

describe("pageCopyFor", () => {
  it("sums up the slideshow on the start card as the export does", () => {
    const copy = pageCopyFor(WORDS, "en", {
      pictureCount: 50,
      durationMs: 250_400,
      withMusic: true,
    });

    expect(copy.summary).toBe("50 pictures · 4:10 · with music");
    expect(copy.eyebrow).toBe("Shared slideshow");
    expect(copy.madeWith).toBe("Shared with Glissando");
  });

  it("never shows a sample-music credit: the share page is not one of its surfaces", () => {
    const copy = pageCopyFor(WORDS, "en", {
      pictureCount: 1,
      durationMs: 4000,
      withMusic: false,
    });

    expect(copy.sampleMusicCredit).toBe("");
  });

  it("counts in the language's plural and digits", () => {
    const one = pageCopyFor(WORDS, "en", { pictureCount: 1, durationMs: 4000, withMusic: false });
    const many = pageCopyFor(
      { ...WORDS, pictures: { one: "{count} Bild", other: "{count} Bilder" } },
      "de",
      { pictureCount: 1234, durationMs: 4000, withMusic: false },
    );

    expect(one.summary).toBe("1 picture · 0:04 · without music");
    expect(many.summary).toBe("1.234 Bilder · 0:04 · without music");
  });
});
