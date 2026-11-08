import { describe, expect, it } from "vitest";
import { addPickedSongs, type SongReadQueue } from "./picked-song-intake";
import type { SongRowHost } from "./song-row-host";
import type { ImportSong } from "./import-session";
import type { MusicPickPorts } from "./music-pick";

const queue: SongReadQueue = { next: (step) => step() };

describe("addPickedSongs", () => {
  it("stops tracking a song's read once it has settled", async () => {
    let songs: readonly ImportSong[] = [];
    const tracked = new Map<number, AbortController>();
    let nextKey = 0;
    const host: SongRowHost = {
      songs: () => songs,
      setSongs: (next) => (songs = next),
      nextKey: () => (nextKey += 1),
      beginRead: (key) => {
        const controller = new AbortController();
        tracked.set(key, controller);
        return controller.signal;
      },
      endRead: (key) => void tracked.delete(key),
      readSignal: (key) => tracked.get(key)?.signal,
      removeSong: () => undefined,
    };
    const ports: MusicPickPorts = {
      probeMusic: () => Promise.resolve({ durationMs: 1000 }),
      convertMusic: () => Promise.reject(new Error("must not convert")),
      log: () => undefined,
    };

    await addPickedSongs(host, [new File(["ID3" + "\0".repeat(20)], "a.mp3")], ports, queue);

    expect(songs.map((song) => song.kind)).toEqual(["chosen"]);
    expect(tracked.size).toBe(0);
  });
});
