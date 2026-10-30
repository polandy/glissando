import { describe, expect, it } from "vitest";
import { composeSlideshow } from "./compose-slideshow";
import { parseSlideshow } from "../player/parse-slideshow";
import type { PictureFocus } from "../library/picture-focus";
import type { StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import { NO_SONG_BEATS } from "./playlist";
import { NO_SONG_LOUDNESS } from "./song-loudness";

function picture(id: string, capturedAt: string): StoredPicture {
  return {
    id,
    capturedAt,
    fileName: `${id}.jpg`,
    width: 400,
    height: 300,
    colours: { veil: "#404040", accent: "#C0C0C0" },
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
    pictures: [picture("a", "2025-07-01T10:00:00Z"), picture("b", "2025-07-02T10:00:00Z")],
    songs: [],
    secondsPerPicture: 5,
    ...overrides,
  };
}

describe("composeSlideshow with an own duration and transition", () => {
  it("plays the own duration and the own effect, at the length that duration gives", () => {
    const [first, second] = storedSlideshow().pictures as [StoredPicture, StoredPicture];
    const stored = storedSlideshow({
      pictures: [{ ...first, durationMs: 2000, transition: "dissolve" }, second],
    });

    const [slide] = composeSlideshow(
      stored,
      sources,
      NO_FOCUS,
      NO_SONG_BEATS,
      NO_SONG_LOUDNESS,
      "en",
    ).slides;

    expect(slide?.durationMs).toBe(2000);
    expect(slide?.transitionToNext).toEqual({ effect: "dissolve", durationMs: 600 });
  });

  it("composes a cut as a slide without transitionToNext, which the player accepts", () => {
    const [first, second] = storedSlideshow().pictures as [StoredPicture, StoredPicture];
    const stored = storedSlideshow({ pictures: [{ ...first, transition: "cut" }, second] });

    const composed = composeSlideshow(
      stored,
      sources,
      NO_FOCUS,
      NO_SONG_BEATS,
      NO_SONG_LOUDNESS,
      "en",
    );

    expect(composed.slides[0]?.durationMs).toBe(5000);
    expect(composed.slides[0]).not.toHaveProperty("transitionToNext");
    expect(() => parseSlideshow(composed)).not.toThrow();
  });
});
