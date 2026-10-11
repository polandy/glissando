import { afterEach, describe, expect, it } from "vitest";
import { decodeMusicWithWebAudio, DETECTION_SAMPLE_RATE } from "./decode-music";
import { pcmWav } from "./testing/pcm-wav";
import { beatlessPad, clickTrack, SYNTHETIC_SAMPLE_RATE } from "./testing/synthetic-music";
import { startBeatWorker, WorkerBeatDetector } from "./worker-beat-detector";

const workers: Worker[] = [];

function detector(): WorkerBeatDetector {
  return new WorkerBeatDetector(decodeMusicWithWebAudio, () => {
    const worker = startBeatWorker();
    workers.push(worker);
    return worker;
  });
}

const wavFile = (samples: Float32Array): Blob =>
  new Blob([pcmWav(samples, SYNTHETIC_SAMPLE_RATE)], { type: "audio/wav" });

afterEach(() => {
  for (const worker of workers.splice(0)) worker.terminate();
});

describe("the beat worker", () => {
  it("decodes a generated track to mono samples at the detection rate", async () => {
    const decoded = await decodeMusicWithWebAudio(wavFile(new Float32Array(SYNTHETIC_SAMPLE_RATE)));

    expect(decoded.sampleRate).toBe(DETECTION_SAMPLE_RATE);
    expect(decoded.samples.length).toBe(DETECTION_SAMPLE_RATE);
  });

  it("finds the tempo of a generated 120 BPM click track", async () => {
    const beats = await detector().detect(wavFile(clickTrack(20, 120).samples));

    expect(beats.kind).toBe("beats");
    expect(beats.kind === "beats" && Math.abs(beats.beatsPerMinute - 120)).toBeLessThan(1);
  });

  it("finds no clear beat in a generated beatless pad", async () => {
    const beats = await detector().detect(wavFile(beatlessPad(20, 7).samples));

    expect(beats).toEqual({ kind: "none" });
  });

  it("rejects a file that is no music, and keeps working", async () => {
    const beatDetector = detector();

    await expect(beatDetector.detect(new Blob(["not music"]))).rejects.toThrow();
    await expect(beatDetector.detect(wavFile(clickTrack(20, 120).samples))).resolves.toMatchObject({
      kind: "beats",
    });
  });
});
