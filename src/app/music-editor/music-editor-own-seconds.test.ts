import { describe, expect, it } from "vitest";
import type { MusicBeats } from "../../beats";
import { OWN_SECONDS_PICTURE_LENGTH } from "../../library/picture-length";
import { setPictureLength } from "../../library/slideshow-edits-timing";
import type { StoredPicture, StoredSlideshow } from "../../library/stored-slideshow";
import type { BeatsStatus } from "../beats/music-beats-known";
import { firstSongView } from "./testing/first-song-view";

/** A beat every 400 ms (150 BPM) from 100 ms on, across a minute. */
const STEADY: MusicBeats = {
  kind: "beats",
  beatsMs: Array.from({ length: 150 }, (_, beat) => 100 + beat * 400),
  beatsPerMinute: 150,
};
const FOUND: BeatsStatus = { kind: "known", beats: STEADY };
const LISTENING: BeatsStatus = { kind: "listening" };

function slideshow(trackMs: number, own: Partial<StoredSlideshow> = {}): StoredSlideshow {
  const pictures: StoredPicture[] = ["a", "b", "c", "d"].map((id) => ({
    id,
    capturedAt: "2025-07-01T10:00:00Z",
    width: 1,
    height: 1,
    fileName: `${id}.jpg`,
    colours: { veil: "#404040", accent: "#C0C0C0" },
  }));
  return {
    id: "show",
    title: "Summer",
    createdAt: "2025-07-02T00:00:00Z",
    pictures,
    secondsPerPicture: 5,
    pictureLength: OWN_SECONDS_PICTURE_LENGTH,
    songs: [{ id: "m1", fileName: "generated.wav", durationMs: trackMs, mimeType: "audio/wav" }],
    ...own,
  };
}

describe("musicEditorView, pictures lasting their own seconds with music", () => {
  it("offers the picture length with its seconds, and filling the music as the other choice", () => {
    expect(firstSongView(slideshow(60_000), FOUND).pictureLength).toEqual({
      ownSeconds: true,
      secondsPerPicture: 5,
    });
    const filling = setPictureLength(slideshow(60_000), undefined);
    expect(firstSongView(filling, FOUND).pictureLength).toEqual({
      ownSeconds: false,
      secondsPerPicture: 5,
    });
  });

  it("ends the slideshow on the beat nearest its pictures' length, fading a longer song out there", () => {
    // The changes would fall at 5000, 10 000 and 15 000 and the end at 20 000; the nearest beats
    // are 4900, 10 100, 14 900 and 20 100, but the second sits on a phrase start at 9700, the
    // nearer-by-half-a-beat rule taking it.
    const view = firstSongView(slideshow(60_000), FOUND);

    expect(view.slideChanges.map((change) => change.atMs)).toEqual([4900, 9700, 14_900]);
    expect(view.slideshowMs).toBe(20_100);
    expect(view.audibleEndMs).toBe(20_100);
    expect(view.fadeOut).toEqual({ ms: 5000, own: false, reason: "slideshow-ends" });
    expect(view.note).toEqual({
      kind: "own-seconds",
      secondsPerPicture: 5,
      onTheBeat: true,
      slideshowMs: 20_100,
    });
  });

  it("names the seconds in the picture changes' texts, which no longer speak of sharing", () => {
    expect(firstSongView(slideshow(60_000), FOUND).pictureChanges).toMatchObject({
      kind: "beats",
      secondsPerPicture: 5,
    });
    expect(firstSongView(slideshow(60_000), LISTENING).pictureChanges).toEqual({
      kind: "listening",
      secondsPerPicture: 5,
    });
  });

  it("warns that a shorter song leaves the last pictures in silence, because of their seconds", () => {
    const view = firstSongView(slideshow(12_000), LISTENING);

    expect(view.note).toEqual({
      kind: "outlasts",
      overMs: 8000,
      automaticCount: 4,
      secondsPerPicture: 5,
    });
  });

  it("shrinks the pictures to end with a shorter song instead of outlasting it (ADR-0047)", () => {
    // 4 pictures at 5 s would outlast a 16 s song, but a 4 s share stays at or above the
    // floor (2/3 of 5 s), so they shrink to it instead of ending in silence.
    const view = firstSongView(slideshow(16_000), FOUND);

    expect(view.note).toEqual({ kind: "fitted", shareMs: 4000, onTheBeat: true });
  });
});
