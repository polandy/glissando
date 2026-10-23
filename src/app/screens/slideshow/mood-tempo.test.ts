import { describe, expect, it } from "vitest";
import type { BeatPassState } from "../../../library/beat-pass";
import { DRUMS, NO_CLEAR_BEAT } from "../../../library/testing/beat-pass-fixtures";
import type { SongBeats } from "../../../compose/playlist";
import { EVEN_PICTURE_CHANGES } from "../../../library/own-music";
import type { StoredMusic } from "../../../library/stored-slideshow";
import { slideshowMoodBpm } from "./mood-tempo";

const IDLE_PASS: BeatPassState = {
  running: false,
  listening: new Set(),
  found: new Map(),
  undecodable: new Set(),
};

function song(id: string, evenChanges = false): StoredMusic {
  const base: StoredMusic = { id, fileName: `${id}.mp3`, durationMs: 2000, mimeType: "audio/mpeg" };
  return evenChanges ? { ...base, pictureChanges: EVEN_PICTURE_CHANGES } : base;
}

describe("slideshowMoodBpm", () => {
  it("is undefined without a mood, however clear the beat", () => {
    const stored: SongBeats = new Map([["a", DRUMS]]);
    const bpm = slideshowMoodBpm({ songs: [song("a")] }, stored, IDLE_PASS);

    expect(bpm).toBeUndefined();
  });

  it("takes the tempo from a song's already persisted beats", () => {
    const stored: SongBeats = new Map([["a", DRUMS]]);

    const bpm = slideshowMoodBpm({ mood: "calm", songs: [song("a")] }, stored, IDLE_PASS);

    expect(bpm).toBe(120);
  });

  it("takes the tempo from the background pass before it is stored", () => {
    const pass: BeatPassState = { ...IDLE_PASS, found: new Map([["a", DRUMS]]) };

    const bpm = slideshowMoodBpm({ mood: "calm", songs: [song("a")] }, new Map(), pass);

    expect(bpm).toBe(120);
  });

  it("skips a song opted into even picture changes", () => {
    const stored: SongBeats = new Map([["a", DRUMS]]);

    const bpm = slideshowMoodBpm({ mood: "calm", songs: [song("a", true)] }, stored, IDLE_PASS);

    expect(bpm).toBeUndefined();
  });

  it("is undefined without a clear beat anywhere", () => {
    const stored: SongBeats = new Map([["a", NO_CLEAR_BEAT]]);

    const bpm = slideshowMoodBpm({ mood: "calm", songs: [song("a")] }, stored, IDLE_PASS);

    expect(bpm).toBeUndefined();
  });
});
