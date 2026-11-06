import { describe, expect, it } from "vitest";
import { decodePeaksWithWebAudio } from "../app/music-editor/decode-peaks";
import {
  createFullRateDecoder,
  probeDeviceSampleRate,
} from "../music-analysis/decode-music-full-rate";
import { MAX_MUSIC_DURATION_MS, MusicOverLimitError } from "./music-limits";
import { silentWav } from "./testing/silent-wav";

const SAMPLE_RATE = 8000;
const SHORT_MS = 2000;
const JUST_OVER_MS = MAX_MUSIC_DURATION_MS + 1000;

/**
 * What a decode came to, as a label: a failing assertion would otherwise print the decoded
 * samples, hundreds of megabytes for a song over the cap.
 */
async function outcome(decoding: Promise<unknown>): Promise<string> {
  try {
    await decoding;
    return "decoded";
  } catch (error) {
    return error instanceof MusicOverLimitError ? error.limit : "failed otherwise";
  }
}

const decoders = {
  peaks: (music: Blob) => decodePeaksWithWebAudio(music),
  analysis: createFullRateDecoder(probeDeviceSampleRate),
};

describe.each(Object.entries(decoders))("the %s decode", (_name, decode) => {
  it("decodes a short song", async () => {
    expect(await outcome(decode(new Blob([silentWav(SHORT_MS, SAMPLE_RATE)])))).toBe("decoded");
  });

  it("refuses a song longer than the duration cap before decoding it", async () => {
    const tooLong = new Blob([silentWav(JUST_OVER_MS, SAMPLE_RATE)]);

    expect(await outcome(decode(tooLong))).toBe("tooLong");
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
