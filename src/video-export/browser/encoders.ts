import type { AudioEncoderPort, VideoEncoderPort } from "../ports";

/** The first error an encoder reported, raised on every later call. */
class EncoderFailure {
  error: Error | null = null;
  readonly #listeners: ((error: Error) => void)[] = [];

  report(error: Error): void {
    this.error ??= error;
    this.#listeners.splice(0).forEach((listener) => listener(error));
  }

  throwIfFailed(): void {
    if (this.error !== null) {
      throw this.error;
    }
  }

  /** Calls `listener` as soon as the encoder fails; returns the unsubscribe. */
  onFailure(listener: (error: Error) => void): () => void {
    this.#listeners.push(listener);
    return () => {
      const index = this.#listeners.indexOf(listener);
      if (index !== -1) {
        this.#listeners.splice(index, 1);
      }
    };
  }
}

export type VideoChunkOutput = (chunk: EncodedVideoChunk, meta?: EncodedVideoChunkMetadata) => void;
export type AudioChunkOutput = (chunk: EncodedAudioChunk, meta?: EncodedAudioChunkMetadata) => void;

/** WebCodecs' `VideoEncoder`, its chunks going to `output`. */
export class WebCodecsVideoEncoder implements VideoEncoderPort<VideoFrame> {
  readonly #encoder: VideoEncoder;
  readonly #failure = new EncoderFailure();

  constructor(config: VideoEncoderConfig, output: VideoChunkOutput) {
    this.#encoder = new VideoEncoder({
      output: (chunk, meta) => output(chunk, meta),
      error: (error) => this.#failure.report(error),
    });
    this.#encoder.configure(config);
  }

  get encodeQueueSize(): number {
    return this.#encoder.encodeQueueSize;
  }

  dequeued(): Promise<void> {
    this.#failure.throwIfFailed();
    return new Promise((resolve, reject) => {
      const unsubscribe = this.#failure.onFailure(reject);
      this.#encoder.addEventListener(
        "dequeue",
        () => {
          unsubscribe();
          resolve();
        },
        { once: true },
      );
    });
  }

  encode(frame: VideoFrame, options: { readonly keyFrame: boolean }): void {
    this.#failure.throwIfFailed();
    this.#encoder.encode(frame, { keyFrame: options.keyFrame });
  }

  async flush(): Promise<void> {
    this.#failure.throwIfFailed();
    await this.#encoder.flush();
    this.#failure.throwIfFailed();
  }

  close(): void {
    if (this.#encoder.state !== "closed") {
      this.#encoder.close();
    }
  }
}

/** WebCodecs' `AudioEncoder`, its chunks going to `output`. */
export class WebCodecsAudioEncoder implements AudioEncoderPort<AudioData> {
  readonly #encoder: AudioEncoder;
  readonly #failure = new EncoderFailure();

  constructor(config: AudioEncoderConfig, output: AudioChunkOutput) {
    this.#encoder = new AudioEncoder({
      output: (chunk, meta) => output(chunk, meta),
      error: (error) => this.#failure.report(error),
    });
    this.#encoder.configure(config);
  }

  encode(block: AudioData): void {
    this.#failure.throwIfFailed();
    this.#encoder.encode(block);
  }

  async flush(): Promise<void> {
    this.#failure.throwIfFailed();
    await this.#encoder.flush();
    this.#failure.throwIfFailed();
  }

  close(): void {
    if (this.#encoder.state !== "closed") {
      this.#encoder.close();
    }
  }
}
