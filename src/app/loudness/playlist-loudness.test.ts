import { describe, expect, it } from "vitest";
import type { MusicLoudness } from "../../loudness";
import type { LoudnessPassState } from "../../library/loudness-pass";
import type { LoudnessStatus } from "./music-loudness-known";
import { PlaylistLoudness } from "./playlist-loudness";

const MEASURED: MusicLoudness = {
  blockMeanSquares: new Float32Array([0.01]),
  hopPeaks: new Float32Array([0.5]),
};

/** A pass that tells its subscribers an unchanging state and records what it is asked for. */
class FakePass {
  readonly asked: string[] = [];
  subscribers = 0;
  readonly state: LoudnessPassState = {
    running: true,
    listening: new Set(),
    found: new Map([["b", MEASURED]]),
    undecodable: new Set(),
  };

  subscribe(listener: (state: LoudnessPassState) => void): () => void {
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
  let latest: ReadonlyMap<string, LoudnessStatus> = new Map();
  const loudness = new PlaylistLoudness(
    { store: { musicLoudness: () => Promise.resolve(undefined) }, pass, log: () => {} },
    (status) => (latest = status),
  );
  return { pass, loudness, latest: () => latest };
}

describe("PlaylistLoudness", () => {
  it("follows every song, asking the pass to listen for each once", async () => {
    const { pass, loudness, latest } = watch();

    await loudness.follow(["a", "b"]);
    await loudness.follow(["a", "b"]);

    expect(pass.asked).toEqual(["a", "b"]);
    expect(latest()).toEqual(
      new Map([
        ["a", { kind: "listening" }],
        ["b", { kind: "known", loudness: MEASURED }],
      ]),
    );
  });

  it("stops following a song taken out of the playlist", async () => {
    const { pass, loudness, latest } = watch();
    await loudness.follow(["a", "b"]);

    await loudness.follow(["b"]);

    expect(latest().has("b")).toBe(true);
    expect(latest().has("a")).toBe(false);
    expect(pass.subscribers).toBe(1);
  });

  it("follows no song once disposed", async () => {
    const { pass, loudness } = watch();
    await loudness.follow(["a", "b"]);

    loudness.dispose();

    expect(pass.subscribers).toBe(0);
  });
});
