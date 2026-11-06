import { describe, expect, it } from "vitest";
import type { MusicBeats } from "../../beats";
import { SILENT } from "../../library/testing/music-analysis-pass-fixtures";
import type { MusicAnalysisPassState } from "../../library/music-analysis-pass";
import type { SongsBeatsStatus } from "../music-editor/slideshow-times";
import { PlaylistBeats } from "./playlist-beats";

const DRUMS: MusicBeats = { kind: "beats", beatsMs: [500, 1000], beatsPerMinute: 120 };

/** A pass that tells its subscribers an unchanging state and records what it is asked for. */
class FakePass {
  readonly asked: string[] = [];
  subscribers = 0;
  readonly state: MusicAnalysisPassState = {
    running: true,
    listening: new Set(),
    found: new Map([["b", { beats: DRUMS, loudness: SILENT }]]),
    undecodable: new Set(),
  };

  subscribe(listener: (state: MusicAnalysisPassState) => void): () => void {
    this.subscribers += 1;
    listener(this.state);
    return () => (this.subscribers -= 1);
  }

  listenFor(musicId: string): void {
    this.asked.push(musicId);
  }
}

function watch() {
  const pass = new FakePass();
  let latest: SongsBeatsStatus = new Map();
  const beats = new PlaylistBeats(
    { store: { musicBeats: () => Promise.resolve(undefined) }, pass, log: () => {} },
    (status) => (latest = status),
  );
  return { pass, beats, latest: () => latest };
}

describe("PlaylistBeats", () => {
  it("follows every song, asking the pass to listen for each once", async () => {
    const { pass, beats, latest } = watch();

    await beats.follow(["a", "b"]);
    await beats.follow(["a", "b"]);

    expect(pass.asked).toEqual(["a", "b"]);
    expect(latest()).toEqual(
      new Map([
        ["a", { kind: "listening" }],
        ["b", { kind: "known", beats: DRUMS }],
      ]),
    );
  });

  it("stops following a song taken out of the playlist", async () => {
    const { pass, beats, latest } = watch();
    await beats.follow(["a", "b"]);

    await beats.follow(["b"]);

    expect(latest().has("b")).toBe(true);
    expect(latest().has("a")).toBe(false);
    expect(pass.subscribers).toBe(1);
  });

  it("follows no song once disposed", async () => {
    const { pass, beats } = watch();
    await beats.follow(["a", "b"]);

    beats.dispose();

    expect(pass.subscribers).toBe(0);
  });
});
