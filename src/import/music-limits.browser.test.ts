import { describe, expect, it } from "vitest";
import { decodeMusicWithWebAudio } from "../beats/decode-music";
import { decodePeaksWithWebAudio } from "../app/music-editor/decode-peaks";
import { createFullRateDecoder, decodeMusicFullRate } from "../loudness/decode-music-full-rate";
import { MAX_MUSIC_DURATION_MS, MusicOverLimitError } from "./music-limits";
import { silentWav } from "./testing/silent-wav";

const SAMPLE_RATE = 8000;
const SHORT_MS = 2000;
const JUST_OVER_MS = MAX_MUSIC_DURATION_MS + 1000;

const decoders = {
  peaks: (music: Blob) => decodePeaksWithWebAudio(music),
  beats: (music: Blob) => decodeMusicWithWebAudio(music),
  loudness: (music: Blob) => decodeMusicFullRate(music),
};

describe.each(Object.entries(decoders))("the %s decode", (_name, decode) => {
  it("decodes a short song", async () => {
    await expect(decode(new Blob([silentWav(SHORT_MS, SAMPLE_RATE)]))).resolves.toBeDefined();
  });

  it("refuses a song longer than the duration cap before decoding it", async () => {
    const tooLong = new Blob([silentWav(JUST_OVER_MS, SAMPLE_RATE)]);

    await expect(decode(tooLong)).rejects.toMatchObject({
      name: new MusicOverLimitError("tooLong").name,
      limit: "tooLong",
    });
  });
});

describe("the full-rate decode's device rate", () => {
  it("is probed once for any number of songs", async () => {
    let probes = 0;
    const decode = createFullRateDecoder(() => {
      probes += 1;
      return Promise.resolve(SAMPLE_RATE);
    });
    const song = new Blob([silentWav(SHORT_MS, SAMPLE_RATE)]);

    await decode(song);
    await decode(song);

    expect(probes).toBe(1);
  });
});
