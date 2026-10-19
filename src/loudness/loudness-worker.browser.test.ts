import { afterEach, describe, expect, it } from "vitest";
import { excerptLoudnessLufs } from "./excerpt-loudness";
import { decodeMusicFullRate } from "./decode-music-full-rate";
import { pcmWav } from "./testing/pcm-wav";
import { sineTone } from "./testing/synthetic-tones";
import { startLoudnessWorker, WorkerLoudnessMeter } from "./worker-loudness-meter";

const TONE_HZ = 1000;
const TONE_AMPLITUDE = 0.1; // -20 dBFS
const DURATION_MS = 20_000;
const SOURCE_SAMPLE_RATE = 48_000;
const EXPECTED_LUFS = -20.0; // the same signal in both channels at full scale measures 0.0 LUFS
const TOLERANCE_LU = 0.5;

const workers: Worker[] = [];

function meter(): WorkerLoudnessMeter {
  return new WorkerLoudnessMeter(decodeMusicFullRate, () => {
    const worker = startLoudnessWorker();
    workers.push(worker);
    return worker;
  });
}

function stereoToneWav(): Blob {
  const channel = sineTone(TONE_HZ, TONE_AMPLITUDE, DURATION_MS, SOURCE_SAMPLE_RATE);
  return new Blob([pcmWav([channel, channel], SOURCE_SAMPLE_RATE)], { type: "audio/wav" });
}

afterEach(() => {
  for (const worker of workers.splice(0)) worker.terminate();
});

describe("the loudness worker", () => {
  it("decodes a generated track keeping every channel at a full decode rate", async () => {
    const decoded = await decodeMusicFullRate(stereoToneWav());

    expect(decoded.channels).toHaveLength(2);
    expect(decoded.sampleRate).toBeGreaterThanOrEqual(SOURCE_SAMPLE_RATE / 2);
    expect(decoded.channels[0]?.length).toBeGreaterThan(0);
  });

  it("measures a known -20 dBFS stereo sine close to -20.0 LUFS", async () => {
    const loudness = await meter().measure(stereoToneWav());

    const lufs = excerptLoudnessLufs(loudness, 0, DURATION_MS);

    expect(lufs).not.toBeNull();
    expect(lufs as number).toBeCloseTo(EXPECTED_LUFS, 0);
    expect(Math.abs((lufs as number) - EXPECTED_LUFS)).toBeLessThan(TOLERANCE_LU);
  });

  it("rejects a file that is no music, and keeps working", async () => {
    const loudnessMeter = meter();

    await expect(loudnessMeter.measure(new Blob(["not music"]))).rejects.toThrow();
    await expect(loudnessMeter.measure(stereoToneWav())).resolves.toMatchObject({
      blockMeanSquares: expect.anything(),
    });
  });
});
