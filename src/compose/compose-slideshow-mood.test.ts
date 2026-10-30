import { describe, expect, it } from "vitest";
import type { PictureFocus } from "../library/picture-focus";
import type { StoredMusic, StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import { pictureSlide } from "../player/testing/picture-slide";
import { composeSlideshow } from "./compose-slideshow";
import { NO_SONG_BEATS, type SongBeats } from "./playlist";
import { NO_SONG_LOUDNESS } from "./song-loudness";

function picture(id: string, overrides: Partial<StoredPicture> = {}): StoredPicture {
  return {
    id,
    capturedAt: "2025-07-01T10:00:00Z",
    fileName: `${id}.jpg`,
    width: 400,
    height: 300,
    colours: { veil: "#404040", accent: "#C0C0C0" },
    ...overrides,
  };
}

const sources = {
  picture: (id: string) => `pictures/${id}.jpg`,
  music: (id: string) => `music/${id}.mp3`,
  video: (id: string) => `videos/${id}.mp4`,
};

const NO_FOCUS: ReadonlyMap<string, PictureFocus> = new Map();

function storedSlideshow(overrides: Partial<StoredSlideshow> = {}): StoredSlideshow {
  return {
    id: "s1",
    title: "July 2025",
    createdAt: "2025-07-21T00:00:00Z",
    pictures: [picture("a"), picture("b", { capturedAt: "2025-07-01T10:05:00Z" })],
    songs: [],
    secondsPerPicture: 5,
    ...overrides,
  };
}

function composed(stored: StoredSlideshow, beats: SongBeats = NO_SONG_BEATS) {
  return composeSlideshow(stored, sources, NO_FOCUS, beats, NO_SONG_LOUDNESS, "en");
}

describe("composeSlideshow with the slideshow's mood", () => {
  it("paces pictures by the stored seconds per picture while the slideshow stores no mood", () => {
    const [first] = composed(storedSlideshow()).slides;
    expect(first?.durationMs).toBe(5000);
  });

  it("paces a picture by the calm mood's target seconds without a tempo", () => {
    const [first] = composed(storedSlideshow({ mood: "calm" })).slides;
    expect(first?.durationMs).toBe(7000);
  });

  it("paces a picture by the lively mood's target seconds without a tempo", () => {
    const [first] = composed(storedSlideshow({ mood: "lively" })).slides;
    expect(first?.durationMs).toBe(3000);
  });

  it("never fills the music under a mood, ignoring the stored pictureLength", () => {
    const song: StoredMusic = {
      id: "song-1",
      fileName: "song.mp3",
      durationMs: 60_000,
      mimeType: "audio/mpeg",
    };
    const stored = storedSlideshow({ mood: "calm", songs: [song] });

    // The calm target (7 s) each, not split to fill the 60 s song.
    expect(composed(stored).slides.map((slide) => slide.durationMs)).toEqual([7000, 7000]);
  });

  it("keeps a picture's own duration, transition and motion under a mood", () => {
    const own = {
      from: { zoom: 2, centerX: 0.5, centerY: 0.5 },
      to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
    };
    const stored = storedSlideshow({
      mood: "calm",
      pictures: [
        picture("a", { durationMs: 4000, transition: "dissolve", kenBurns: own }),
        picture("b", { capturedAt: "2025-07-01T10:05:00Z" }),
      ],
    });

    const [first] = composed(stored).slides;
    expect(first?.durationMs).toBe(4000);
    expect(first?.transitionToNext?.effect).toBe("dissolve");
    expect(pictureSlide(first).kenBurns).toEqual({ ...own, easing: "linear" });
  });

  it("hands over with the calm mood's default transition and length", () => {
    const [first] = composed(storedSlideshow({ mood: "calm" })).slides;

    // 45% of 7000 ms would be 3150 ms, capped at 1600 ms.
    expect(first?.transitionToNext).toEqual({ effect: "crossfade", durationMs: 1600 });
  });

  it("hands over with the lively mood's default transition and length", () => {
    const [first] = composed(storedSlideshow({ mood: "lively" })).slides;

    // 15% of 3000 ms, under the 500 ms cap; index 0 of "alternate" cycles to "crossfade".
    expect(first?.transitionToNext).toEqual({ effect: "crossfade", durationMs: 450 });
  });

  it("scales the automatic Ken Burns motion by the mood's strength", () => {
    const calm = composed(storedSlideshow({ mood: "calm" })).slides[0];
    const custom = composed(storedSlideshow()).slides[0];

    expect(pictureSlide(calm).kenBurns.to.zoom).toBeLessThan(pictureSlide(custom).kenBurns.to.zoom);
  });
});
