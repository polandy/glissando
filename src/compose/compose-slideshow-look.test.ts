import { describe, expect, it } from "vitest";
import { composeSlideshow } from "./compose-slideshow";
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
    pictures: [picture("a", "2025-07-01T10:00:00Z")],
    songs: [],
    secondsPerPicture: 5,
    ...overrides,
  };
}

function composed(stored: StoredSlideshow) {
  return composeSlideshow(stored, sources, NO_FOCUS, NO_SONG_BEATS, NO_SONG_LOUDNESS);
}

describe("composeSlideshow with the slideshow's look", () => {
  it("carries no look while the slideshow stores none", () => {
    expect(composed(storedSlideshow())).not.toHaveProperty("look");
  });

  it("carries the stored look", () => {
    expect(composed(storedSlideshow({ look: "warm" }))).toHaveProperty("look", "warm");
  });
});
