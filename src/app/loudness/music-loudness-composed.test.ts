import { describe, expect, it } from "vitest";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import type { MusicLoudness } from "../../loudness";
import { storedSongLoudness } from "./music-loudness-composed";

const DRUMS: MusicLoudness = {
  blockMeanSquares: new Float32Array([0.01]),
  hopPeaks: new Float32Array([0.5]),
};
const AMBIENT: MusicLoudness = {
  blockMeanSquares: new Float32Array([0.001]),
  hopPeaks: new Float32Array([0.1]),
};
const WITHOUT_MUSIC: StoredSlideshow = {
  id: "show",
  title: "July",
  createdAt: "2025-07-02T08:00:00Z",
  pictures: [],
  songs: [],
  secondsPerPicture: 5,
};
const song = (id: string) => ({
  id,
  fileName: `${id}.mp3`,
  durationMs: 2000,
  mimeType: "audio/mpeg",
});
const WITH_MUSIC: StoredSlideshow = { ...WITHOUT_MUSIC, songs: [song("drums"), song("ambient")] };

describe("storedSongLoudness", () => {
  it("reads the stored loudness of every song, by music id", async () => {
    const logged: unknown[] = [];
    const store = {
      musicLoudness: (id: string) => Promise.resolve(id === "drums" ? DRUMS : AMBIENT),
    };

    await expect(storedSongLoudness(store, WITH_MUSIC, (e) => logged.push(e))).resolves.toEqual(
      new Map([
        ["drums", DRUMS],
        ["ambient", AMBIENT],
      ]),
    );
    expect(logged).toEqual([]);
  });

  it("leaves out a song not measured yet, and has none without music", async () => {
    const store = {
      musicLoudness: (id: string) => Promise.resolve(id === "drums" ? DRUMS : undefined),
    };

    await expect(storedSongLoudness(store, WITH_MUSIC, () => undefined)).resolves.toEqual(
      new Map([["drums", DRUMS]]),
    );
    await expect(storedSongLoudness(store, WITHOUT_MUSIC, () => undefined)).resolves.toEqual(
      new Map(),
    );
  });

  it("logs loudness that cannot be read and goes on without that song's", async () => {
    const failure = new Error("the database is gone");
    const logged: unknown[] = [];
    const store = {
      musicLoudness: (id: string) =>
        id === "drums" ? Promise.resolve(DRUMS) : Promise.reject(failure),
    };

    await expect(storedSongLoudness(store, WITH_MUSIC, (e) => logged.push(e))).resolves.toEqual(
      new Map([["drums", DRUMS]]),
    );
    expect(logged).toEqual([failure]);
  });
});
