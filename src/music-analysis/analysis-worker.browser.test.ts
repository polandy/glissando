import { afterEach, describe, expect, it } from "vitest";
import {
  asStereo,
  beatlessPad,
  clickTrack,
  drumPattern,
  type SyntheticTrack,
} from "../beats/testing/synthetic-music";
import type { MusicAnalysis } from "../library/music-analyser";
import { excerptLoudnessLufs, measureLoudness } from "../loudness";
import { pcmWav } from "../loudness/testing/pcm-wav";
import { sineTone } from "../loudness/testing/synthetic-tones";
import type { AnalysisReply, AnalysisRequest } from "./analysis-worker-protocol";
import { createFullRateDecoder, probeDeviceSampleRate } from "./decode-music-full-rate";
import { startAnalysisWorker, WorkerMusicAnalyser } from "./worker-music-analyser";

const SECONDS = 30;
const SEED = 12_345;
const RIGHT_GAIN = 0.5;
const BPM_TOLERANCE = 1;
/** A found beat counts as the true one within this distance (the detector's own tests use 50 ms). */
const BEAT_TOLERANCE_MS = 50;
/** A found beat sits this close to the true one: within one analysis hop, as in the detector's own tests. */
const ON_THE_BEAT_TOLERANCE_MS = 12;
const MIN_MATCHED_SHARE = 0.95;

const PAD_SECONDS = 20;
const PAD_SEED = 7;
const TONE_HZ = 1000;
const TONE_AMPLITUDE = 0.1; // -20 dBFS
const TONE_DURATION_MS = 20_000;
const TONE_SAMPLE_RATE = 48_000;
const EXPECTED_LUFS = -20.0; // the same signal in both channels at full scale measures 0.0 LUFS
const TOLERANCE_LU = 0.5;

const workers: Worker[] = [];

afterEach(() => {
  for (const worker of workers.splice(0)) worker.terminate();
});

/** Runs one analysis in the real worker, the way `WorkerMusicAnalyser` does. */
async function analyseInWorker(
  channels: readonly Float32Array[],
  sampleRate: number,
): Promise<MusicAnalysis> {
  const worker = startAnalysisWorker();
  workers.push(worker);
  const reply = Promise.withResolvers<AnalysisReply>();
  worker.onmessage = (event: MessageEvent<AnalysisReply>) => reply.resolve(event.data);
  worker.onerror = () => reply.reject(new Error("the analysis worker crashed"));
  const copies = channels.map((channel) => channel.slice());
  const request: AnalysisRequest = { id: 7, channels: copies, sampleRate };
  worker.postMessage(
    request,
    copies.map((channel) => channel.buffer),
  );
  const answer = await reply.promise;
  if (answer.kind === "failed") throw new Error(answer.message);
  return answer.analysis;
}

/** How the found beats fared against the true ones, as short numbers: never the beat lists. */
function scoreBeats(
  analysis: MusicAnalysis,
  track: SyntheticTrack,
): { bpm: number; matchedShare: number; foundShare: number; worstOffsetMs: number } {
  if (analysis.beats.kind !== "beats")
    return { bpm: 0, matchedShare: 0, foundShare: 0, worstOffsetMs: Infinity };
  const found = analysis.beats.beatsMs;
  const within = (beatMs: number, others: readonly number[]) =>
    others.some((otherMs) => Math.abs(otherMs - beatMs) <= BEAT_TOLERANCE_MS);
  const offsets = track.beatsMs.map((trueMs) =>
    Math.min(...found.map((foundMs) => Math.abs(foundMs - trueMs))),
  );
  return {
    bpm: analysis.beats.beatsPerMinute,
    matchedShare:
      track.beatsMs.filter((beatMs) => within(beatMs, found)).length / track.beatsMs.length,
    foundShare: found.filter((beatMs) => within(beatMs, track.beatsMs)).length / found.length,
    worstOffsetMs: Math.max(...offsets),
  };
}

/** How many of the measured loudness values differ from `expected`; zero means identical. */
function loudnessDifferences(
  actual: MusicAnalysis["loudness"],
  expected: MusicAnalysis["loudness"],
): number {
  const differing = (a: Float32Array, b: Float32Array) =>
    a.length === b.length
      ? a.reduce((count, value, index) => count + (value === b[index] ? 0 : 1), 0)
      : -1;
  return (
    Math.abs(differing(actual.blockMeanSquares, expected.blockMeanSquares)) +
    Math.abs(differing(actual.hopPeaks, expected.hopPeaks))
  );
}

const songs = [
  ["a click track", (rate: number) => clickTrack(SECONDS, 120, rate), 120],
  ["a drum pattern", (rate: number) => drumPattern(SECONDS, 96, SEED, rate), 96],
] as const;

describe.each([44_100, 48_000])("the analysis worker, given stereo at %i Hz", (rate) => {
  describe.each(songs)("%s", (_name, render, bpm) => {
    it("finds its tempo and every beat on the true one, from our own downmix", async () => {
      const track = render(rate);

      const analysis = await analyseInWorker(asStereo(track, RIGHT_GAIN), rate);

      const score = scoreBeats(analysis, track);
      expect(Math.abs(score.bpm - bpm)).toBeLessThanOrEqual(BPM_TOLERANCE);
      expect(score.matchedShare).toBeGreaterThanOrEqual(MIN_MATCHED_SHARE);
      expect(score.foundShare).toBeGreaterThanOrEqual(MIN_MATCHED_SHARE);
      expect(score.worstOffsetMs).toBeLessThanOrEqual(ON_THE_BEAT_TOLERANCE_MS);
    });

    it("measures the loudness of the channels as they came, at their own rate", async () => {
      const channels = asStereo(render(rate), RIGHT_GAIN);

      const analysis = await analyseInWorker(channels, rate);

      expect(loudnessDifferences(analysis.loudness, measureLoudness(channels, rate))).toBe(0);
    });
  });
});

describe("the music analyser over the real worker and decoder", () => {
  const decode = createFullRateDecoder(probeDeviceSampleRate);
  const analyser = () =>
    new WorkerMusicAnalyser(decode, () => {
      const worker = startAnalysisWorker();
      workers.push(worker);
      return worker;
    });

  it("finds the beats of a generated stereo file and rejects a file that is no music, in turn", async () => {
    const track = drumPattern(SECONDS, 96, SEED, 44_100);
    const file = new Blob([pcmWav(asStereo(track, RIGHT_GAIN), 44_100)], { type: "audio/wav" });
    const musicAnalyser = analyser();

    const rejected = await musicAnalyser.analyse(new Blob(["not music"])).then(
      () => "analysed",
      (error: unknown) => (error instanceof Error ? error.name : "other"),
    );
    const score = scoreBeats(await musicAnalyser.analyse(file), track);

    expect(rejected).toBe("MusicUndecodableError");
    expect(Math.abs(score.bpm - 96)).toBeLessThanOrEqual(BPM_TOLERANCE);
    expect(score.matchedShare).toBeGreaterThanOrEqual(MIN_MATCHED_SHARE);
    expect(score.worstOffsetMs).toBeLessThanOrEqual(ON_THE_BEAT_TOLERANCE_MS);
  });

  it("finds no clear beat in a generated beatless pad", async () => {
    const pad = beatlessPad(PAD_SECONDS, PAD_SEED);
    const file = new Blob([pcmWav(asStereo(pad, RIGHT_GAIN), pad.sampleRate)], {
      type: "audio/wav",
    });

    const analysis = await analyser().analyse(file);

    expect(analysis.beats).toEqual({ kind: "none" });
  });

  it("measures a known -20 dBFS stereo sine close to -20.0 LUFS", async () => {
    const analysis = await analyser().analyse(stereoToneWav());

    const lufs = excerptLoudnessLufs(analysis.loudness, 0, TONE_DURATION_MS);

    expect(lufs).not.toBeNull();
    expect(Math.abs((lufs as number) - EXPECTED_LUFS)).toBeLessThan(TOLERANCE_LU);
  });

  it("decodes a generated track keeping every channel at a full decode rate", async () => {
    const decoded = await decode(stereoToneWav());

    expect(decoded.channels).toHaveLength(2);
    expect(decoded.sampleRate).toBeGreaterThanOrEqual(TONE_SAMPLE_RATE / 2);
    expect(decoded.channels[0]?.length).toBeGreaterThan(0);
  });
});

function stereoToneWav(): Blob {
  const channel = sineTone(TONE_HZ, TONE_AMPLITUDE, TONE_DURATION_MS, TONE_SAMPLE_RATE);
  return new Blob([pcmWav([channel, channel], TONE_SAMPLE_RATE)], { type: "audio/wav" });
}
