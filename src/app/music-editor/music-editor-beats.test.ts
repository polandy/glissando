import { describe, expect, it } from "vitest";
import type { MusicBeats } from "../../beats";
import type { StoredMusic, StoredPicture, StoredSlideshow } from "../../library/stored-slideshow";
import type { BeatsStatus } from "../beats/music-beats-known";
import { musicEditorView } from "./music-editor-view";

const TRACK_MS = 30_000;
/** A beat every 400 ms (150 BPM) from 100 ms on, across the track. */
const STEADY: MusicBeats = {
  kind: "beats",
  beatsMs: Array.from({ length: 75 }, (_, beat) => 100 + beat * 400),
  beatsPerMinute: 149.6,
};
const FOUND: BeatsStatus = { kind: "known", beats: STEADY };

function slideshow(
  music: Partial<StoredMusic>,
  durations: readonly (number | undefined)[] = [undefined, undefined, undefined, undefined],
): StoredSlideshow {
  const pictures: StoredPicture[] = durations.map((durationMs, index) => ({
    id: `p${index}`,
    capturedAt: "2025-07-01T10:00:00Z",
    width: 1,
    height: 1,
    fileName: `p${index}.jpg`,
    ...(durationMs === undefined ? {} : { durationMs }),
  }));
  return {
    id: "show",
    title: "Summer",
    createdAt: "2025-07-02T00:00:00Z",
    pictures,
    secondsPerPicture: 5,
    music: {
      id: "m1",
      fileName: "drums.wav",
      durationMs: TRACK_MS,
      mimeType: "audio/wav",
      trim: { startMs: 4000, endMs: 24_000 },
      ...music,
    },
  };
}

describe("musicEditorView, the picture changes", () => {
  it("puts the automatic changes on the nearest beats, all on the beat", () => {
    const view = musicEditorView(slideshow({}), FOUND);

    expect(view.slideChanges).toEqual([
      { atMs: 8900, offBeat: false },
      { atMs: 14_100, offBeat: false },
      { atMs: 18_900, offBeat: false },
    ]);
  });

  it("ticks every beat of the track, every fourth taller, while on the beat", () => {
    const view = musicEditorView(slideshow({}), FOUND);

    expect(view.beatTicks).toHaveLength(75);
    expect(view.beatTicks.slice(0, 5)).toEqual([
      { atMs: 100, bar: true },
      { atMs: 500, bar: false },
      { atMs: 900, bar: false },
      { atMs: 1300, bar: false },
      { atMs: 1700, bar: true },
    ]);
  });

  it("offers the choice on the beat with the rounded tempo", () => {
    expect(musicEditorView(slideshow({}), FOUND).pictureChanges).toEqual({
      kind: "beats",
      beatsPerMinute: 150,
      onTheBeat: true,
      ownDurationNumbers: [],
    });
  });

  it("with even picture changes, shares the excerpt and ticks no beats", () => {
    const view = musicEditorView(slideshow({ pictureChanges: "even" }), FOUND);

    expect(view.slideChanges.map((change) => change.atMs)).toEqual([9000, 14_000, 19_000]);
    expect(view.slideChanges.every((change) => !change.offBeat)).toBe(true);
    expect(view.beatTicks).toEqual([]);
    expect(view.pictureChanges).toMatchObject({ kind: "beats", onTheBeat: false });
    expect(view.note).toEqual({
      kind: "shared",
      automaticCount: 4,
      shareMs: 5000,
      onTheBeat: false,
    });
  });

  it("notes the shares as varying while the pictures change on the beat", () => {
    expect(musicEditorView(slideshow({}), FOUND).note).toEqual({
      kind: "shared",
      automaticCount: 4,
      shareMs: 5000,
      onTheBeat: true,
    });
  });

  it("puts the change before an own duration on the beat, marks only the one after it off the beat, and names that picture", () => {
    const view = musicEditorView(slideshow({}, [undefined, 3000, undefined, undefined]), FOUND);

    expect(view.slideChanges).toEqual([
      { atMs: 9700, offBeat: false },
      { atMs: 12_700, offBeat: true },
      { atMs: 18_500, offBeat: false },
    ]);
    expect(view.pictureChanges).toMatchObject({ ownDurationNumbers: [2] });
  });

  it.each([
    ["listening", { kind: "listening" }, { kind: "listening" }],
    ["undecodable", { kind: "undecodable" }, { kind: "undecodable" }],
    ["no clear beat", { kind: "known", beats: { kind: "none" } }, { kind: "none" }],
  ] as const)("while %s, shares the excerpt evenly without ticks", (_, status, expected) => {
    const view = musicEditorView(slideshow({}), status);

    expect(view.pictureChanges).toEqual(expected);
    expect(view.slideChanges.map((change) => change.atMs)).toEqual([9000, 14_000, 19_000]);
    expect(view.beatTicks).toEqual([]);
  });
});
