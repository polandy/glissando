import type { AudioBufferSink } from "mediabunny";
import { clipSecondsFor, placeClipBuffer, type ClipAudioSlide } from "../clip-audio-plan";
import type { ClipSoundMix } from "./audio-mixer";
import type { OpenVideo } from "./clip-frames";
import { openClipFile, type OpenedClip } from "./open-clip";

interface ClipAudioReader {
  readonly clip: OpenedClip;
  /** Null for a clip without sound. */
  readonly sink: AudioBufferSink | null;
}

/**
 * The sound of the video slides' clips, decoded a window at a time from the file's `Blob` as the
 * mix is rendered, so no clip's whole sound is held (ADR-0035). Each distinct clip file is opened
 * once.
 */
export class ClipSound implements ClipSoundMix {
  readonly #slides: readonly ClipAudioSlide[];
  readonly #openVideo: OpenVideo;
  readonly #readers = new Map<string, Promise<ClipAudioReader>>();

  constructor(slides: readonly ClipAudioSlide[], openVideo: OpenVideo) {
    this.#slides = slides;
    this.#openVideo = openVideo;
  }

  async mixInto(
    context: OfflineAudioContext,
    output: AudioNode,
    fromMs: number,
    toMs: number,
  ): Promise<void> {
    for (const slide of this.#slides) {
      const window = clipSecondsFor(slide, fromMs, toMs);
      const { sink } = window === null ? { sink: null } : await this.#reader(slide.src);
      if (window === null || sink === null) {
        continue;
      }
      const gain = context.createGain();
      gain.gain.value = slide.volume;
      gain.connect(output);
      for await (const { buffer, timestamp, duration } of sink.buffers(
        window.fromSeconds,
        window.toSeconds,
      )) {
        const placement = placeClipBuffer(
          slide,
          { startSeconds: timestamp, durationSeconds: duration },
          fromMs,
        );
        if (placement !== null) {
          const source = context.createBufferSource();
          source.buffer = buffer;
          source.connect(gain);
          source.start(placement.whenSeconds, placement.offsetSeconds, placement.durationSeconds);
        }
      }
    }
  }

  dispose(): void {
    for (const reader of this.#readers.values()) {
      void reader.then(
        ({ clip }) => clip.dispose(),
        () => undefined,
      );
    }
    this.#readers.clear();
  }

  #reader(src: string): Promise<ClipAudioReader> {
    let reader = this.#readers.get(src);
    if (reader === undefined) {
      reader = this.#load(src);
      this.#readers.set(src, reader);
    }
    return reader;
  }

  async #load(src: string): Promise<ClipAudioReader> {
    const clip = await openClipFile(await this.#openVideo(src));
    if (clip === null) {
      throw new Error(`the clip ${src} holds no video this browser can read`);
    }
    if (clip.audio === null) {
      return { clip, sink: null };
    }
    const { AudioBufferSink } = await import("./mediabunny-reader");
    return { clip, sink: new AudioBufferSink(clip.audio) };
  }
}
