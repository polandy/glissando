import { describe, expect, it } from "vitest";
import type { MusicBeats } from "../../beats";
import type { BeatPassState } from "../../library/beat-pass";
import type { BeatsStatus } from "./music-beats-known";
import { TrackBeats } from "./track-beats";

const DRUMS: MusicBeats = { kind: "beats", beatsMs: [500, 1000], beatsPerMinute: 120 };
const NO_CLEAR_BEAT: MusicBeats = { kind: "none" };

/** A pass whose state the test sets; it tells its subscribers like the real one. */
class FakePass {
  #listeners = new Set<(state: BeatPassState) => void>();
  state: BeatPassState = { running: true, listening: new Set(["drums"]), found: new Map() };

  subscribe(listener: (state: BeatPassState) => void): () => void {
    this.#listeners.add(listener);
    listener(this.state);
    return () => this.#listeners.delete(listener);
  }

  publish(state: BeatPassState): void {
    this.state = state;
    this.#listeners.forEach((listener) => listener(state));
  }

  get subscribers(): number {
    return this.#listeners.size;
  }
}

function watch(stored: Promise<MusicBeats | undefined>, pass = new FakePass()) {
  const statuses: BeatsStatus[] = [];
  const logged: unknown[] = [];
  const store = { musicBeats: () => stored };
  const track = new TrackBeats("drums", { store, pass, log: (e) => logged.push(e) }, (status) =>
    statuses.push(status),
  );
  return { track, pass, statuses, logged };
}

describe("TrackBeats", () => {
  it("listens while the stored beats are read, then tells what was stored", async () => {
    const { track, statuses } = watch(Promise.resolve(DRUMS));

    expect(statuses.at(-1)).toEqual({ kind: "listening" });
    await track.read;

    expect(statuses.at(-1)).toEqual({ kind: "known", beats: DRUMS });
  });

  it("tells what the pass finds for the track while it is open", async () => {
    const { track, pass, statuses } = watch(Promise.resolve(undefined));
    await track.read;

    pass.publish({
      running: false,
      listening: new Set(),
      found: new Map([["drums", NO_CLEAR_BEAT]]),
    });

    expect(statuses.at(-1)).toEqual({ kind: "known", beats: NO_CLEAR_BEAT });
  });

  it("is unknown once the pass ended without a result for the track", async () => {
    const { track, pass, statuses } = watch(Promise.resolve(undefined));
    await track.read;

    pass.publish({ running: false, listening: new Set(), found: new Map() });

    expect(statuses.at(-1)).toEqual({ kind: "unknown" });
  });

  it("logs stored beats that cannot be read and goes on with what the pass tells", async () => {
    const failure = new Error("the database is gone");
    const { track, pass, statuses, logged } = watch(Promise.reject(failure));
    await track.read;

    pass.publish({ running: false, listening: new Set(), found: new Map([["drums", DRUMS]]) });

    expect(logged).toEqual([failure]);
    expect(statuses.at(-1)).toEqual({ kind: "known", beats: DRUMS });
  });

  it("stops listening to the pass once disposed", () => {
    const { track, pass } = watch(Promise.resolve(undefined));
    expect(pass.subscribers).toBe(1);

    track.dispose();

    expect(pass.subscribers).toBe(0);
  });
});
