import { describe, expect, it } from "vitest";
import { levelWav } from "../../import/testing/silent-wav";
import type { MusicTrack } from "../../player";
import { AUDIO_SAMPLE_RATE } from "../plan";
import { AudioMixer } from "./audio-mixer";

const LEVELS: Readonly<Record<string, number>> = { low: 0.25, high: 0.5 };

function placed(src: string, atMs: number): MusicTrack {
  return { src, atMs, startMs: 0, endMs: 2000, fadeInMs: 0, fadeOutMs: 0 };
}

/** Opens each generated song by its level's name, counting the opens. */
function generatedSongs() {
  const opened: string[] = [];
  return {
    opened,
    open: (src: string): Promise<Blob> => {
      opened.push(src);
      const level = LEVELS[src];
      if (level === undefined) {
        return Promise.reject(new Error(`no generated song ${src}`));
      }
      return Promise.resolve(
        new Blob([levelWav(3000, level, AUDIO_SAMPLE_RATE)], { type: "audio/wav" }),
      );
    },
  };
}

/** The first channel's sample at `seconds` into the 3 s segment rendered from 0. */
async function levelsOf(renderer: AudioMixer, ...seconds: number[]): Promise<number[]> {
  const sampleCount = 3 * AUDIO_SAMPLE_RATE;
  const audio = await renderer.segment({ startSample: 0, sampleCount, timestampUs: 0 });
  const channel = new Float32Array(sampleCount);
  audio.copyTo(channel, { planeIndex: 0 });
  audio.close();
  return seconds.map((at) => channel[Math.round(at * AUDIO_SAMPLE_RATE)] ?? Number.NaN);
}

describe("AudioMixer", () => {
  it("mixes every track from its place, two at once where they overlap", async () => {
    const songs = generatedSongs();
    const renderer = await AudioMixer.decode([placed("low", 0), placed("high", 1000)], songs.open);

    const [first, both, second] = await levelsOf(renderer, 0.5, 1.5, 2.5);

    expect(first).toBeCloseTo(0.25, 2);
    expect(both).toBeCloseTo(0.75, 2);
    expect(second).toBeCloseTo(0.5, 2);
  });

  it("decodes a song once though it plays twice", async () => {
    const songs = generatedSongs();

    const renderer = await AudioMixer.decode([placed("low", 0), placed("low", 1000)], songs.open);

    expect(await levelsOf(renderer, 1.5)).toEqual([expect.closeTo(0.5, 2)]);
    expect(songs.opened).toEqual(["low"]);
  });
});
