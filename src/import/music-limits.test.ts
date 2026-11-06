import { describe, expect, it } from "vitest";
import {
  MAX_MUSIC_BYTES,
  MAX_MUSIC_DURATION_MS,
  MusicOverLimitError,
  assertMusicWithinLimits,
} from "./music-limits";

/** A Blob-like of the given size, so no test allocates 200 MiB. */
function musicOfSize(size: number): Blob {
  const music = new Blob(["x"]);
  Object.defineProperty(music, "size", { value: size });
  return music;
}

describe("assertMusicWithinLimits", () => {
  it.each([
    { name: "a short song", size: 1000, durationMs: 1000 },
    { name: "exactly the byte cap", size: MAX_MUSIC_BYTES, durationMs: 1000 },
    { name: "exactly the duration cap", size: 1000, durationMs: MAX_MUSIC_DURATION_MS },
  ])("lets $name through", async ({ size, durationMs }) => {
    await expect(
      assertMusicWithinLimits(musicOfSize(size), () => Promise.resolve(durationMs)),
    ).resolves.toBeUndefined();
  });

  it.each([
    {
      name: "a byte over the byte cap",
      size: MAX_MUSIC_BYTES + 1,
      durationMs: 1000,
      limit: "tooLarge",
    },
    {
      name: "a millisecond over the duration cap",
      size: 1000,
      durationMs: MAX_MUSIC_DURATION_MS + 1,
      limit: "tooLong",
    },
  ])("refuses $name with its own reason", async ({ size, durationMs, limit }) => {
    await expect(
      assertMusicWithinLimits(musicOfSize(size), () => Promise.resolve(durationMs)),
    ).rejects.toMatchObject({ name: "MusicOverLimitError", limit });
  });

  it("checks the bytes before probing, so a huge file is never opened", async () => {
    const probed: Blob[] = [];
    const music = musicOfSize(MAX_MUSIC_BYTES + 1);

    await expect(
      assertMusicWithinLimits(music, (probe) => {
        probed.push(probe);
        return Promise.resolve(1000);
      }),
    ).rejects.toBeInstanceOf(MusicOverLimitError);

    expect(probed).toEqual([]);
  });
});
