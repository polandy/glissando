import { describe, expect, it } from "vitest";
import { composeSlideshow } from "./compose-slideshow";
import { NO_BEATS, type MusicBeats } from "../beats";
import type { PictureFocus } from "../library/picture-focus";
import type { StoredMusic, StoredPicture, StoredSlideshow } from "../library/stored-slideshow";

function picture(id: string): StoredPicture {
  return { id, capturedAt: "2025-07-01T10:00:00Z", fileName: `${id}.jpg`, width: 400, height: 300 };
}

const sources = { picture: (id: string) => id, music: (id: string) => id };
const NO_FOCUS: ReadonlyMap<string, PictureFocus> = new Map();
const MUSIC: StoredMusic = {
  id: "m1",
  fileName: "Sommerwind.mp3",
  durationMs: 12_000,
  mimeType: "audio/mpeg",
};
/** A beat every 450 ms of the track from its start. */
const BEATS: MusicBeats = {
  kind: "beats",
  beatsMs: Array.from({ length: 30 }, (_, n) => n * 450),
  beatsPerMinute: 133,
};

function storedSlideshow(music: StoredMusic): StoredSlideshow {
  return {
    id: "s1",
    title: "July 2025",
    createdAt: "2025-07-21T00:00:00Z",
    pictures: [picture("a"), picture("b"), picture("c")],
    secondsPerPicture: 5,
    music,
  };
}

const compose = (music: StoredMusic, beats: MusicBeats) =>
  composeSlideshow(storedSlideshow(music), sources, NO_FOCUS, beats);
const durationsOf = (music: StoredMusic, beats: MusicBeats) =>
  compose(music, beats).slides.map((slide) => slide.durationMs);

describe("composeSlideshow on the music's beats", () => {
  it("changes the pictures on the beats nearest the even shares", () => {
    // Even shares of 4000 ms; the nearest beats are 4050 and 8100.
    expect(durationsOf(MUSIC, BEATS)).toEqual([4050, 4050, 3900]);
  });

  it("measures the beats from the trimmed excerpt's start", () => {
    // The excerpt starts at 1000 ms of the track, so its beats fall at 350, 800, … 3950, … 8000.
    const trimmed = { ...MUSIC, durationMs: 14_000, trim: { startMs: 1000, endMs: 13_000 } };

    expect(durationsOf(trimmed, BEATS)).toEqual([3950, 4050, 4000]);
  });

  it("lets a transition into a picture on the beat last whole beats, so it starts on one", () => {
    const [first, second, last] = compose(MUSIC, BEATS).slides;

    // At most 1000 ms usually: two beats of 450 ms fit, three do not.
    expect(first?.transitionToNext?.durationMs).toBe(900);
    expect(second?.transitionToNext?.durationMs).toBe(900);
    expect(last?.transitionToNext).toBeUndefined();
  });

  it("shares the music evenly without a clear beat, as before", () => {
    const even = compose(MUSIC, NO_BEATS);

    expect(even.slides.map((slide) => slide.durationMs)).toEqual([4000, 4000, 4000]);
    expect(even.slides[0]?.transitionToNext?.durationMs).toBe(1000);
  });

  it("shares the music evenly when its picture changes are even, beats or not", () => {
    const evenMusic: StoredMusic = { ...MUSIC, pictureChanges: "even" };

    expect(compose(evenMusic, BEATS)).toEqual(compose(evenMusic, NO_BEATS));
    expect(durationsOf(evenMusic, BEATS)).toEqual([4000, 4000, 4000]);
  });

  it("plays the music as long as before: only the boundaries inside move", () => {
    expect(compose(MUSIC, BEATS).music).toEqual(compose(MUSIC, NO_BEATS).music);
  });
});
