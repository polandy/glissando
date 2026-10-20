import { describe, expect, it } from "vitest";
import { composeSlideshow } from "./compose-slideshow";
import { pictureDurationsMs } from "./picture-durations-ms";
import { NO_SONG_BEATS } from "./playlist";
import { NO_SONG_LOUDNESS } from "./song-loudness";
import { slideUnits } from "./slide-units";
import { parseSlideshow } from "../player/parse-slideshow";
import { pictureSlide } from "../player/testing/picture-slide";
import type { MusicBeats } from "../beats";
import type { PictureFocus } from "../library/picture-focus";
import type { StoredVideo } from "../library/own-video";
import type { StoredPicture, StoredSlideshow } from "../library/stored-slideshow";

const sources = {
  picture: (id: string) => `pictures/${id}.jpg`,
  music: (id: string) => `music/${id}.mp3`,
  video: (id: string) => `videos/${id}.mp4`,
};
const NO_FOCUS: ReadonlyMap<string, PictureFocus> = new Map();
const STILL = { zoom: 1, centerX: 0.5, centerY: 0.5 };

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

function clip(id: string, video: Partial<StoredVideo> = {}, overrides = {}): StoredPicture {
  return picture(id, {
    video: { mediaId: `v-${id}`, sourceMs: 60_000, startMs: 1900, endMs: 10_300, ...video },
    ...overrides,
  });
}

function show(pictures: StoredPicture[], overrides: Partial<StoredSlideshow> = {}) {
  return {
    id: "s1",
    title: "Clips",
    createdAt: "2025-07-21T00:00:00Z",
    pictures,
    songs: [],
    secondsPerPicture: 5,
    ...overrides,
  };
}

const SONG = { id: "m1", fileName: "a.mp3", durationMs: 60_000, mimeType: "audio/mpeg" };
const BEATS: MusicBeats = {
  kind: "beats",
  beatsMs: Array.from({ length: 85 }, (_, n) => n * 700),
  beatsPerMinute: 86,
};

describe("composeSlideshow with a video slide", () => {
  it("emits the clip from its media id, the picture being the poster", () => {
    const slideshow = composeSlideshow(
      show([clip("a")]),
      sources,
      NO_FOCUS,
      NO_SONG_BEATS,
      NO_SONG_LOUDNESS,
    );

    expect(pictureSlide(slideshow.slides[0])).toMatchObject({
      image: { src: "pictures/a.jpg" },
      video: { src: "videos/v-a.mp4", startMs: 1900, endMs: 10_300, volume: 1 },
    });
  });

  it("maps the volume to 0..1 and writes duckMusic only when it is off", () => {
    const slideshow = composeSlideshow(
      show([clip("a", { volume: 60 }), clip("b", { volume: 0, duckMusic: false }), clip("c")]),
      sources,
      NO_FOCUS,
      NO_SONG_BEATS,
      NO_SONG_LOUDNESS,
    );
    const [a, b, c] = slideshow.slides.map((slide) => pictureSlide(slide).video);

    expect(a).toMatchObject({ volume: 0.6 });
    expect(a).not.toHaveProperty("duckMusic");
    expect(b).toMatchObject({ volume: 0, duckMusic: false });
    expect(c).toMatchObject({ volume: 1 });
  });

  it("lasts the excerpt, whatever the seconds per picture or an own duration", () => {
    const slideshow = composeSlideshow(
      show([clip("a", {}, { durationMs: 3000 }), picture("b")]),
      sources,
      NO_FOCUS,
      NO_SONG_BEATS,
      NO_SONG_LOUDNESS,
    );

    expect(slideshow.slides.map((slide) => slide.durationMs)).toEqual([8400, 5000]);
  });

  it("holds the picture still instead of an automatic or own Ken Burns", () => {
    const own = { from: { zoom: 1.5, centerX: 0.2, centerY: 0.2 }, to: STILL };
    const slideshow = composeSlideshow(
      show([clip("a", {}, { kenBurns: own })]),
      sources,
      NO_FOCUS,
      NO_SONG_BEATS,
      NO_SONG_LOUDNESS,
    );

    expect(pictureSlide(slideshow.slides[0]).kenBurns).toEqual({
      from: STILL,
      to: STILL,
      easing: "linear",
    });
  });

  it("never pairs a portrait clip with a portrait neighbour", () => {
    const portrait = { width: 300, height: 400 };
    const pictures = [picture("a", portrait), clip("b", {}, portrait), picture("c", portrait)];

    expect(slideUnits(pictures, undefined).map((unit) => unit.pictureIndices)).toEqual([
      [0],
      [1],
      [2],
    ]);
  });

  it("keeps its caption and transition like a picture's", () => {
    const slideshow = composeSlideshow(
      show([clip("a", {}, { caption: "Jetty", transition: "wipe-right" }), picture("b")]),
      sources,
      NO_FOCUS,
      NO_SONG_BEATS,
      NO_SONG_LOUDNESS,
    );

    expect(pictureSlide(slideshow.slides[0])).toMatchObject({
      caption: "Jetty",
      transitionToNext: { effect: "wipe-right" },
    });
  });

  it("composes JSON the player accepts", () => {
    const slideshow = composeSlideshow(
      show([clip("a", { volume: 35 }), picture("b")]),
      sources,
      NO_FOCUS,
      NO_SONG_BEATS,
      NO_SONG_LOUDNESS,
    );

    expect(parseSlideshow(JSON.parse(JSON.stringify(slideshow)))).toEqual(slideshow);
  });

  it("shares only the rest of the music between the pictures", () => {
    const slideshow = composeSlideshow(
      show([clip("a"), picture("b"), picture("c")], { songs: [SONG] }),
      sources,
      NO_FOCUS,
      NO_SONG_BEATS,
      NO_SONG_LOUDNESS,
    );

    expect(slideshow.slides.map((slide) => slide.durationMs)).toEqual([8400, 25_800, 25_800]);
  });

  it("never snaps the clip's length to the beats", () => {
    const slideshow = composeSlideshow(
      show([picture("a"), clip("b"), picture("c")], { songs: [SONG] }),
      sources,
      NO_FOCUS,
      new Map([[SONG.id, BEATS]]),
      NO_SONG_LOUDNESS,
    );

    expect(slideshow.slides[1]?.durationMs).toBe(8400);
  });

  it("shows a video picture's slide length to the picture editor", () => {
    expect(pictureDurationsMs([clip("a"), picture("b")], undefined, undefined, 5)).toEqual([
      8400, 5000,
    ]);
  });
});
