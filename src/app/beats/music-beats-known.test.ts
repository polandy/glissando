import { describe, expect, it } from "vitest";
import { NO_BEATS, type MusicBeats } from "../../beats";
import type { BeatPassState } from "../../library/beat-pass";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { beatsStatus, composedBeats, storedMusicBeats } from "./music-beats-known";

const DRUMS: MusicBeats = { kind: "beats", beatsMs: [500, 1000], beatsPerMinute: 120 };
const WITHOUT_MUSIC: StoredSlideshow = {
  id: "show",
  title: "July",
  createdAt: "2025-07-02T08:00:00Z",
  pictures: [],
  secondsPerPicture: 5,
};
const WITH_MUSIC: StoredSlideshow = {
  ...WITHOUT_MUSIC,
  music: { id: "drums", fileName: "drums.mp3", durationMs: 2000, mimeType: "audio/mpeg" },
};
const IDLE: BeatPassState = {
  running: false,
  listening: new Set(),
  found: new Map(),
  undecodable: new Set(),
};

describe("storedMusicBeats", () => {
  it("reads the stored beats of the slideshow's music", async () => {
    const logged: unknown[] = [];
    const store = {
      musicBeats: (id: string) => Promise.resolve(id === "drums" ? DRUMS : undefined),
    };

    await expect(storedMusicBeats(store, WITH_MUSIC, (e) => logged.push(e))).resolves.toEqual(
      DRUMS,
    );
    expect(logged).toEqual([]);
  });

  it("is no beats for music not listened to yet, and for a slideshow without music", async () => {
    const store = { musicBeats: () => Promise.resolve(undefined) };

    await expect(storedMusicBeats(store, WITH_MUSIC, () => undefined)).resolves.toBe(NO_BEATS);
    await expect(storedMusicBeats(store, WITHOUT_MUSIC, () => undefined)).resolves.toBe(NO_BEATS);
  });

  it("logs beats that cannot be read and goes on without them", async () => {
    const failure = new Error("the database is gone");
    const logged: unknown[] = [];
    const store = { musicBeats: () => Promise.reject(failure) };

    await expect(storedMusicBeats(store, WITH_MUSIC, (e) => logged.push(e))).resolves.toBe(
      NO_BEATS,
    );
    expect(logged).toEqual([failure]);
  });
});

describe("beatsStatus", () => {
  it("is what the pass found, before what was stored", () => {
    const pass = { ...IDLE, found: new Map([["drums", DRUMS]]) };

    expect(beatsStatus("drums", NO_BEATS, pass)).toEqual({ kind: "known", beats: DRUMS });
  });

  it("is what was stored when the pass found nothing for the music", () => {
    expect(beatsStatus("drums", DRUMS, IDLE)).toEqual({ kind: "known", beats: DRUMS });
  });

  it("is listening while nothing is known and the pass runs, or the stored beats are not read yet", () => {
    const running = { ...IDLE, running: true };

    expect(beatsStatus("drums", undefined, running)).toEqual({ kind: "listening" });
    expect(beatsStatus("drums", "reading", IDLE)).toEqual({ kind: "listening" });
  });

  it("is undecodable while the pass could not decode the music, until its beats are known", () => {
    const failed = { ...IDLE, undecodable: new Set(["drums"]) };

    expect(beatsStatus("drums", undefined, failed)).toEqual({ kind: "undecodable" });
    expect(beatsStatus("drums", undefined, { ...failed, running: true })).toEqual({
      kind: "undecodable",
    });
    expect(beatsStatus("drums", DRUMS, failed)).toEqual({ kind: "known", beats: DRUMS });
  });

  it("is still listening once a pass ended without a result for another reason", () => {
    expect(beatsStatus("drums", undefined, IDLE)).toEqual({ kind: "listening" });
  });
});

describe("composedBeats", () => {
  it("composes with the beats known, and with none while listening or undecodable", () => {
    expect(composedBeats({ kind: "known", beats: DRUMS })).toEqual(DRUMS);
    expect(composedBeats({ kind: "listening" })).toBe(NO_BEATS);
    expect(composedBeats({ kind: "undecodable" })).toBe(NO_BEATS);
  });
});
