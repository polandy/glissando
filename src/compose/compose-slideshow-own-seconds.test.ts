import { describe, expect, it } from "vitest";
import { composeSlideshow } from "./compose-slideshow";
import { slideshowDurationMs } from "./slideshow-duration-ms";
import { AUTOMATIC_MUSIC_FADE_OUT_MS } from "./music-excerpt";
import type { MusicBeats } from "../beats";
import { NO_SONG_BEATS } from "./playlist";
import { NO_SONG_LOUDNESS } from "./song-loudness";
import type { PictureFocus } from "../library/picture-focus";
import { OWN_SECONDS_PICTURE_LENGTH } from "../library/picture-length";
import { setPictureLength } from "../library/slideshow-edits-timing";
import type { StoredMusic, StoredPicture, StoredSlideshow } from "../library/stored-slideshow";

function picture(id: string): StoredPicture {
  return {
    id,
    capturedAt: "2025-07-01T10:00:00Z",
    fileName: `${id}.jpg`,
    width: 400,
    height: 300,
    colours: { veil: "#404040", accent: "#C0C0C0" },
  };
}

const sources = {
  picture: (id: string) => id,
  music: (id: string) => id,
  video: (id: string) => id,
};
const NO_FOCUS: ReadonlyMap<string, PictureFocus> = new Map();
const SONG: StoredMusic = {
  id: "m1",
  fileName: "generated-groove.mp3",
  durationMs: 60_000,
  mimeType: "audio/mpeg",
};
/** A beat every 700 ms of the track from its start. */
const BEATS: MusicBeats = {
  kind: "beats",
  beatsMs: Array.from({ length: 85 }, (_, n) => n * 700),
  beatsPerMinute: 86,
};
const OWN_SECONDS: StoredSlideshow = {
  id: "s1",
  title: "July 2025",
  createdAt: "2025-07-21T00:00:00Z",
  pictures: [picture("a"), picture("b"), picture("c"), picture("d")],
  secondsPerPicture: 5,
  pictureLength: OWN_SECONDS_PICTURE_LENGTH,
  songs: [SONG],
};

describe("composeSlideshow when the pictures last their own seconds with music", () => {
  it("keeps the picture length instead of stretching the pictures to the music", () => {
    const slideshow = composeSlideshow(
      OWN_SECONDS,
      sources,
      NO_FOCUS,
      NO_SONG_BEATS,
      NO_SONG_LOUDNESS,
    );

    expect(slideshow.slides.map((slide) => slide.durationMs)).toEqual([5000, 5000, 5000, 5000]);
    expect(slideshowDurationMs(OWN_SECONDS)).toBe(20_000);
  });

  it("changes the pictures and ends on the beats nearest each picture length", () => {
    const slideshow = composeSlideshow(
      OWN_SECONDS,
      sources,
      NO_FOCUS,
      new Map([[SONG.id, BEATS]]),
      NO_SONG_LOUDNESS,
    );

    expect(slideshow.slides.map((slide) => slide.durationMs)).toEqual([4900, 4900, 4900, 5600]);
  });

  it("fades a longer song out as the slideshow ends", () => {
    const { music } = composeSlideshow(
      OWN_SECONDS,
      sources,
      NO_FOCUS,
      NO_SONG_BEATS,
      NO_SONG_LOUDNESS,
    );

    expect(music).toMatchObject([
      { atMs: 0, startMs: 0, endMs: 20_000, fadeOutMs: AUTOMATIC_MUSIC_FADE_OUT_MS },
    ]);
  });

  it("fills the music when the slideshow has no picture length of its own", () => {
    const filling = setPictureLength(OWN_SECONDS, undefined);
    const slideshow = composeSlideshow(filling, sources, NO_FOCUS, NO_SONG_BEATS, NO_SONG_LOUDNESS);

    expect(slideshow.slides.map((slide) => slide.durationMs)).toEqual([
      15_000, 15_000, 15_000, 15_000,
    ]);
  });
});
