import { describe, expect, it } from "vitest";
import type { MusicLoudness } from "../../loudness";
import type { LoudnessPassState } from "../../library/loudness-pass";
import type { LoudnessStatus } from "./music-loudness-known";
import { TrackLoudness } from "./track-loudness";

const MEASURED: MusicLoudness = {
  blockMeanSquares: new Float32Array([0.01]),
  hopPeaks: new Float32Array([0.5]),
};
const QUIET: MusicLoudness = {
  blockMeanSquares: new Float32Array([0.001]),
  hopPeaks: new Float32Array([0.1]),
};

/** A pass whose state the test sets; it tells its subscribers like the real one. */
class FakePass {
  #listeners = new Set<(state: LoudnessPassState) => void>();
  state: LoudnessPassState = {
    running: true,
    listening: new Set(["drums"]),
    found: new Map(),
    undecodable: new Set(),
  };

  subscribe(listener: (state: LoudnessPassState) => void): () => void {
    this.#listeners.add(listener);
    listener(this.state);
    return () => this.#listeners.delete(listener);
  }

  publish(state: LoudnessPassState): void {
    this.state = state;
    this.#listeners.forEach((listener) => listener(state));
  }

  get subscribers(): number {
    return this.#listeners.size;
  }
}

function watch(stored: Promise<MusicLoudness | undefined>, pass = new FakePass()) {
  const statuses: LoudnessStatus[] = [];
  const logged: unknown[] = [];
  const store = { musicLoudness: () => stored };
  const track = new TrackLoudness("drums", { store, pass, log: (e) => logged.push(e) }, (status) =>
    statuses.push(status),
  );
  return { track, pass, statuses, logged };
}

describe("TrackLoudness", () => {
  it("listens while the stored loudness is read, then tells what was stored", async () => {
    const { track, statuses } = watch(Promise.resolve(MEASURED));

    expect(statuses.at(-1)).toEqual({ kind: "listening" });
    await track.read;

    expect(statuses.at(-1)).toEqual({ kind: "known", loudness: MEASURED });
  });

  it("tells what the pass finds for the track while it is open", async () => {
    const { track, pass, statuses } = watch(Promise.resolve(undefined));
    await track.read;

    pass.publish({
      running: false,
      listening: new Set(),
      found: new Map([["drums", QUIET]]),
      undecodable: new Set(),
    });

    expect(statuses.at(-1)).toEqual({ kind: "known", loudness: QUIET });
  });

  it("is undecodable once the pass could not measure the track", async () => {
    const { track, pass, statuses } = watch(Promise.resolve(undefined));
    await track.read;

    pass.publish({
      running: false,
      listening: new Set(),
      found: new Map(),
      undecodable: new Set(["drums"]),
    });

    expect(statuses.at(-1)).toEqual({ kind: "undecodable" });
  });

  it("logs stored loudness that cannot be read and goes on with what the pass tells", async () => {
    const failure = new Error("the database is gone");
    const { track, pass, statuses, logged } = watch(Promise.reject(failure));
    await track.read;

    pass.publish({
      running: false,
      listening: new Set(),
      found: new Map([["drums", MEASURED]]),
      undecodable: new Set(),
    });

    expect(logged).toEqual([failure]);
    expect(statuses.at(-1)).toEqual({ kind: "known", loudness: MEASURED });
  });

  it("stops listening to the pass once disposed", () => {
    const { track, pass } = watch(Promise.resolve(undefined));
    expect(pass.subscribers).toBe(1);

    track.dispose();

    expect(pass.subscribers).toBe(0);
  });
});
