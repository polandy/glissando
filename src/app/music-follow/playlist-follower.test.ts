import { describe, expect, it } from "vitest";
import { PlaylistFollower } from "./playlist-follower";

/** A started track whose stored read the test settles; `told` is what its owner is told so far. */
class FakeTrack {
  readonly read: Promise<void>;
  readonly #settle: () => void;
  disposed = false;
  readonly #onChange: (status: string) => void;

  constructor(onChange: (status: string) => void) {
    this.#onChange = onChange;
    let settle: () => void = () => {};
    this.read = new Promise<void>((resolve) => (settle = resolve));
    this.#settle = settle;
  }

  /** Tells `status` and settles the read, as a track does once its stored value is read. */
  finishRead(status: string): void {
    this.#onChange(status);
    this.#settle();
  }

  dispose(): void {
    this.disposed = true;
  }
}

function watch(toldOnStart?: string) {
  const asked: string[] = [];
  const started: { songId: string; track: FakeTrack }[] = [];
  let latest: ReadonlyMap<string, string> = new Map();
  const playlist = new PlaylistFollower<string>(
    {
      pass: { listenFor: (musicId) => asked.push(musicId) },
      startTrack: (songId, onChange) => {
        if (toldOnStart !== undefined) onChange(toldOnStart);
        const track = new FakeTrack(onChange);
        started.push({ songId, track });
        return track;
      },
    },
    (status) => (latest = status),
  );
  const tracksOf = (songId: string) =>
    started.filter((entry) => entry.songId === songId).map(({ track }) => track);
  return { asked, playlist, tracksOf, latest: () => latest };
}

describe("PlaylistFollower", () => {
  it("starts each song once, asks the pass to listen for it, and resolves once its read is done", async () => {
    const { asked, playlist, tracksOf, latest } = watch();

    const following = playlist.follow(["a", "b"]);
    tracksOf("a")[0]?.finishRead("first");
    tracksOf("b")[0]?.finishRead("second");
    await following;
    await playlist.follow(["a", "b"]);

    expect(asked).toEqual(["a", "b"]);
    expect(tracksOf("a")).toHaveLength(1);
    expect(latest()).toEqual(
      new Map([
        ["a", "first"],
        ["b", "second"],
      ]),
    );
  });

  it("disposes a song taken out of the playlist and forgets its status", async () => {
    const { playlist, tracksOf, latest } = watch();
    const following = playlist.follow(["a", "b"]);
    tracksOf("a")[0]?.finishRead("first");
    tracksOf("b")[0]?.finishRead("second");
    await following;

    await playlist.follow(["b"]);

    expect(tracksOf("a")[0]?.disposed).toBe(true);
    expect(tracksOf("b")[0]?.disposed).toBe(false);
    expect([...latest().keys()]).toEqual(["b"]);
  });

  it("disposes every song once disposed", async () => {
    const { playlist, tracksOf } = watch();
    const following = playlist.follow(["a", "b"]);
    tracksOf("a")[0]?.finishRead("first");
    tracksOf("b")[0]?.finishRead("second");
    await following;

    playlist.dispose();

    expect(tracksOf("a")[0]?.disposed).toBe(true);
    expect(tracksOf("b")[0]?.disposed).toBe(true);
  });

  it("keeps the status a song tells while it starts, as a replayed pass state does", async () => {
    const { playlist, tracksOf, latest } = watch("replayed");

    const following = playlist.follow(["a"]);

    expect(latest().get("a")).toBe("replayed");
    tracksOf("a")[0]?.finishRead("read");
    await following;
    expect(latest().get("a")).toBe("read");
  });

  it("ignores a late tell from a song taken out, even once the song is added again", async () => {
    const { playlist, tracksOf, latest } = watch();
    const first = playlist.follow(["a"]);
    await playlist.follow([]);
    const second = playlist.follow(["a"]);
    const [removed, added] = tracksOf("a");

    added?.finishRead("re-added");
    await second;
    expect(latest().get("a")).toBe("re-added");

    removed?.finishRead("stale");
    await first;
    expect(latest().get("a")).toBe("re-added");
  });
});
