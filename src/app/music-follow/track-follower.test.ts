import { describe, expect, it } from "vitest";
import type { MusicAnalysisPassState } from "../../library/music-analysis-pass";
import { READING_STORED, TrackFollower } from "./track-follower";

/** The status a trivial follower tells: what it has read, and whether the pass found the track. */
function describeStatus(
  musicId: string,
  stored: string | undefined | typeof READING_STORED,
  pass: MusicAnalysisPassState,
): string {
  const read = stored === READING_STORED ? "reading" : (stored ?? "nothing stored");
  return `${read}, ${pass.undecodable.has(musicId) ? "undecodable" : "decodable"}`;
}

const DECODABLE: MusicAnalysisPassState = {
  running: true,
  listening: new Set(),
  found: new Map(),
  undecodable: new Set(),
};
const UNDECODABLE: MusicAnalysisPassState = { ...DECODABLE, undecodable: new Set(["song"]) };

/** A pass whose state the test sets; it tells its subscribers like the real one. */
class FakePass {
  #listeners = new Set<(state: MusicAnalysisPassState) => void>();
  state = DECODABLE;

  subscribe(listener: (state: MusicAnalysisPassState) => void): () => void {
    this.#listeners.add(listener);
    listener(this.state);
    return () => this.#listeners.delete(listener);
  }

  publish(state: MusicAnalysisPassState): void {
    this.state = state;
    this.#listeners.forEach((listener) => listener(state));
  }

  get subscribers(): number {
    return this.#listeners.size;
  }
}

function follow(stored: Promise<string | undefined>, pass = new FakePass()) {
  const statuses: string[] = [];
  const logged: unknown[] = [];
  const track = new TrackFollower(
    "song",
    { readStored: () => stored, pass, log: (error) => logged.push(error), status: describeStatus },
    (status) => statuses.push(status),
  );
  return { track, pass, statuses, logged };
}

describe("TrackFollower", () => {
  it("tells the track as still being read until the stored value is read, then what was stored", async () => {
    const { track, statuses } = follow(Promise.resolve("a tune"));

    expect(statuses.at(-1)).toBe("reading, decodable");
    await track.read;

    expect(statuses.at(-1)).toBe("a tune, decodable");
  });

  it("tells what the pass publishes while it is followed", async () => {
    const { track, pass, statuses } = follow(Promise.resolve("a tune"));
    await track.read;

    pass.publish(UNDECODABLE);

    expect(statuses.at(-1)).toBe("a tune, undecodable");
  });

  it("logs a stored value that cannot be read and goes on as if none were stored", async () => {
    const failure = new Error("the database is gone");
    const { track, pass, statuses, logged } = follow(Promise.reject(failure));
    await track.read;

    pass.publish(UNDECODABLE);

    expect(logged).toEqual([failure]);
    expect(statuses.at(-1)).toBe("nothing stored, undecodable");
  });

  it("stops listening to the pass once disposed", () => {
    const { track, pass } = follow(Promise.resolve(undefined));
    expect(pass.subscribers).toBe(1);

    track.dispose();

    expect(pass.subscribers).toBe(0);
  });
});
