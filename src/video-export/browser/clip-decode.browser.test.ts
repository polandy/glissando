import { ALL_FORMATS, BlobSource, CanvasSink, Input } from "mediabunny";
import { beforeAll, describe, expect, it } from "vitest";
import { server } from "vitest/browser";
import { levelWav } from "../../import/testing/silent-wav";
import { VIDEO_DUCK_VOLUME, type Slideshow } from "../../player";
import { probeVideoExport, runVideoExport } from "..";
import { clipAudioSlides } from "../clip-audio-plan";
import { AUDIO_SAMPLE_RATE } from "../plan";
import { generatedClip, solidPicture } from "../testing/generated-clip";
import { memoryExportTarget } from "../testing/memory-target";
import { AudioMixer } from "./audio-mixer";
import { ClipFrames } from "./clip-frames";
import { canDecodeClip } from "./clip-support";
import { ClipSound } from "./clip-sound";

/** A software encode of a short clip can take a while on a shared runner; a ceiling, not a wait. */
const GENERATION_CEILING_MS = 60_000;
const CLIP_MS = 1500;
const CAPTURED_AT = "2026-07-01T10:00:00Z";
const TONE_AMPLITUDE = 0.5;
const EXPORT_WIDTH = 1280;

let redClip: Blob;
beforeAll(async () => {
  redClip = await generatedClip("#ff0000", CLIP_MS, TONE_AMPLITUDE);
}, GENERATION_CEILING_MS);

function openClip(src: string): Promise<Blob> {
  return src === "red" ? Promise.resolve(redClip) : Promise.reject(new Error(`no clip ${src}`));
}

function centrePixel(canvas: CanvasImageSource & { width: number; height: number }): number[] {
  const copy = new OffscreenCanvas(canvas.width, canvas.height);
  const context = copy.getContext("2d");
  if (context === null) {
    throw new Error("no 2D context");
  }
  context.drawImage(canvas, 0, 0);
  return [
    ...context.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data,
  ];
}

describe("ClipFrames", () => {
  it("decodes the frame at a clip time from the file's bytes", async () => {
    const frames = new ClipFrames("red", openClip, EXPORT_WIDTH);

    const frame = await frames.frameAt(500);
    frames.dispose();

    const [red, green, blue] = centrePixel(frame as OffscreenCanvas);
    expect(red).toBeGreaterThan(200);
    expect(green).toBeLessThan(60);
    expect(blue).toBeLessThan(60);
  });

  it("holds the first frame before the clip's start and the last past its end", async () => {
    const frames = new ClipFrames("red", openClip, EXPORT_WIDTH);

    await expect(frames.frameAt(-300)).resolves.toBeDefined();
    await expect(frames.frameAt(CLIP_MS * 3)).resolves.toBeDefined();
    frames.dispose();
  });

  it("fails loud for a file that holds no video", async () => {
    const frames = new ClipFrames("junk", () => Promise.resolve(new Blob(["nope"])), EXPORT_WIDTH);

    await expect(frames.frameAt(0)).rejects.toThrow("junk");
    frames.dispose();
  });
});

describe("canDecodeClip", () => {
  it("accepts a clip this browser encoded and refuses bytes that are no video", async () => {
    expect(await canDecodeClip({ src: "red", withSound: true }, openClip)).toBe(true);
    expect(
      await canDecodeClip({ src: "x", withSound: false }, () =>
        Promise.resolve(new Blob(["nope"])),
      ),
    ).toBe(false);
  });
});

/** The first channel of `seconds` of the mix from 0, as samples. */
async function mixSamples(mixer: AudioMixer, seconds: number): Promise<Float32Array> {
  const sampleCount = seconds * AUDIO_SAMPLE_RATE;
  const audio = await mixer.segment({ startSample: 0, sampleCount, timestampUs: 0 });
  const channel = new Float32Array(sampleCount);
  audio.copyTo(channel, { planeIndex: 0 });
  audio.close();
  return channel;
}

function peak(samples: Float32Array, fromSeconds: number, toSeconds: number): number {
  return samples
    .subarray(fromSeconds * AUDIO_SAMPLE_RATE, toSeconds * AUDIO_SAMPLE_RATE)
    .reduce((highest, sample) => Math.max(highest, Math.abs(sample)), 0);
}

function mean(samples: Float32Array, fromSeconds: number, toSeconds: number): number {
  const part = samples.subarray(fromSeconds * AUDIO_SAMPLE_RATE, toSeconds * AUDIO_SAMPLE_RATE);
  return part.reduce((sum, sample) => sum + sample, 0) / part.length;
}

const CLIP_SLIDE = {
  image: { src: "p" },
  durationMs: 1000,
  video: { src: "red", startMs: 250, endMs: 1250, volume: 0.5 },
} as const;

// WebKit's AAC encoder stamps every packet 0, so a clip it wrote has no sound to place in time.
describe.skipIf(server.browser === "webkit")("the clip's sound in the audio mix", () => {
  const slides = [{ image: { src: "p" }, durationMs: 2000 }, CLIP_SLIDE];

  it("plays the excerpt at the clip's volume from its slide's start, and nothing outside it", async () => {
    const sound = new ClipSound(clipAudioSlides(slides as never), openClip);
    const mixer = await AudioMixer.decode([], () => Promise.reject(new Error("no music")), {
      sound,
      duckSpans: [],
    });

    const samples = await mixSamples(mixer, 4);
    sound.dispose();

    expect(peak(samples, 0, 1.9)).toBe(0);
    expect(peak(samples, 2.1, 2.9)).toBeGreaterThan(TONE_AMPLITUDE * 0.5 * 0.7);
    expect(peak(samples, 2.1, 2.9)).toBeLessThan(TONE_AMPLITUDE * 0.5 * 1.3);
    expect(peak(samples, 3.1, 4)).toBe(0);
  });

  it("ducks the music under the clip", async () => {
    const sound = new ClipSound(clipAudioSlides(slides as never), openClip);
    const music = {
      src: "level",
      atMs: 0,
      startMs: 0,
      endMs: 6000,
      fadeInMs: 0,
      fadeOutMs: 0,
      gain: 1,
    };
    const mixer = await AudioMixer.decode(
      [music],
      () =>
        Promise.resolve(new Blob([levelWav(6000, 0.5, AUDIO_SAMPLE_RATE)], { type: "audio/wav" })),
      { sound, duckSpans: [{ startMs: 2000, endMs: 3000 }] },
    );

    const samples = await mixSamples(mixer, 6);
    sound.dispose();

    expect(mean(samples, 0.1, 0.5)).toBeCloseTo(0.5, 1);
    expect(mean(samples, 2.3, 2.9)).toBeCloseTo(0.5 * VIDEO_DUCK_VOLUME, 1);
    expect(mean(samples, 4.6, 4.9)).toBeCloseTo(0.5, 1);
  });
});

describe("runVideoExport with a video slide", () => {
  it(
    "draws the clip's frames and mixes its sound into the file",
    async () => {
      const capabilities = await probeVideoExport({ withAudio: true });
      if (!capabilities.supported) {
        throw new Error(`this engine cannot export: ${capabilities.reason}`);
      }
      const still = {
        from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
        to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
        easing: "linear",
      } as const;
      const slideshow: Slideshow = {
        formatVersion: 9,
        title: "With a clip",
        slides: [
          { image: { src: "blue", capturedAt: CAPTURED_AT }, durationMs: 1000, kenBurns: still },
          { ...CLIP_SLIDE, image: { src: "blue", capturedAt: CAPTURED_AT }, kenBurns: still },
        ],
      };
      const blue = await solidPicture("#0000ff");

      const result = await runVideoExport({
        slideshow,
        openPicture: () => Promise.resolve(blue),
        openMusic: () => Promise.reject(new Error("no music")),
        openVideo: openClip,
        preset: "720p",
        audioCodec: capabilities.audioCodec,
        target: memoryExportTarget("with-a-clip.mp4"),
        signal: new AbortController().signal,
      });

      if (result.kind !== "done") {
        throw new Error(`the export ended ${result.kind}`, {
          cause: result.kind === "failed" ? result.error : result,
        });
      }
      const input = new Input({ source: new BlobSource(result.file), formats: ALL_FORMATS });
      const video = await input.getPrimaryVideoTrack();
      expect(await input.getPrimaryAudioTrack()).not.toBeNull();
      if (video === null) {
        throw new Error("the file has no video track");
      }
      const sink = new CanvasSink(video, { width: 64 });
      const before = await sink.getCanvas(0.5);
      const during = await sink.getCanvas(1.5);
      input.dispose();
      const [beforeRed = 0, , beforeBlue = 0] = centrePixel(before?.canvas as OffscreenCanvas);
      const [duringRed = 0, , duringBlue = 0] = centrePixel(during?.canvas as OffscreenCanvas);
      expect(beforeBlue).toBeGreaterThan(beforeRed);
      expect(duringRed).toBeGreaterThan(duringBlue);
    },
    GENERATION_CEILING_MS,
  );
});
