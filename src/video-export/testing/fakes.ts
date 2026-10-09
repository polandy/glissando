import type { AudioSegment } from "../plan";
import type {
  AudioEncoderPort,
  AudioSource,
  FileSink,
  FrameSource,
  FrameTiming,
  MuxerPort,
  VideoEncoderPort,
} from "../ports";

/** Every port writes what happens to one shared log, so tests can check the order. */
export type ExportLog = string[];

export class FakeFrame {
  readonly label: string;
  closed = false;
  constructor(label: string) {
    this.label = label;
  }
  close(): void {
    this.closed = true;
  }
}

export class FakeFrameSource implements FrameSource<FakeFrame> {
  readonly frames: FakeFrame[] = [];
  /** Runs as frame `index` is asked for, e.g. to advance a clock or abort. */
  onFrame: ((index: number) => void) | null = null;
  readonly #log: ExportLog;
  readonly #failures = new Map<number, Error>();
  constructor(log: ExportLog) {
    this.#log = log;
  }
  failAt(index: number, error: Error): void {
    this.#failures.set(index, error);
  }
  frameAt(seconds: number, { timestampUs, durationUs }: FrameTiming): Promise<FakeFrame> {
    const index = this.frames.length;
    this.onFrame?.(index);
    const failure = this.#failures.get(index);
    if (failure !== undefined) {
      return Promise.reject(failure);
    }
    const frame = new FakeFrame(`${seconds}s ${timestampUs}+${durationUs}`);
    this.frames.push(frame);
    this.#log.push(`frame ${seconds}`);
    return Promise.resolve(frame);
  }
}

/** Encodes at once, unless `holdQueue` keeps frames queued until `dequeue`. */
export class FakeVideoEncoder implements VideoEncoderPort<FakeFrame> {
  encodeQueueSize = 0;
  holdQueue = false;
  closed = false;
  readonly encoded: { readonly label: string; readonly keyFrame: boolean }[] = [];
  readonly #log: ExportLog;
  #failure: Error | null = null;
  #dequeueWaiters: (() => void)[] = [];
  #waitListeners: (() => void)[] = [];
  constructor(log: ExportLog) {
    this.#log = log;
  }
  dequeued(): Promise<void> {
    this.#waitListeners.splice(0).forEach((listener) => listener());
    return new Promise((resolve) => this.#dequeueWaiters.push(resolve));
  }
  /** Resolves once the run waits for a dequeue. */
  nextWait(): Promise<void> {
    return new Promise((resolve) => this.#waitListeners.push(resolve));
  }
  dequeue(): void {
    this.encodeQueueSize -= 1;
    this.#dequeueWaiters.splice(0).forEach((resolve) => resolve());
  }
  failWith(error: Error): void {
    this.#failure = error;
  }
  encode(frame: FakeFrame, { keyFrame }: { readonly keyFrame: boolean }): void {
    if (this.#failure !== null) {
      throw this.#failure;
    }
    if (frame.closed) {
      throw new Error(`frame ${frame.label} was closed before it was encoded`);
    }
    this.encoded.push({ label: frame.label, keyFrame });
    this.#log.push("encode video");
    if (this.holdQueue) {
      this.encodeQueueSize += 1;
    }
  }
  flush(): Promise<void> {
    this.#log.push("flush video");
    return this.#failure === null ? Promise.resolve() : Promise.reject(this.#failure);
  }
  close(): void {
    this.closed = true;
    this.#log.push("close video");
  }
}

export class FakeAudioBlock {
  readonly segment: AudioSegment;
  closed = false;
  constructor(segment: AudioSegment) {
    this.segment = segment;
  }
  close(): void {
    this.closed = true;
  }
}

export class FakeAudioSource implements AudioSource<FakeAudioBlock> {
  readonly blocks: FakeAudioBlock[] = [];
  readonly #log: ExportLog;
  constructor(log: ExportLog) {
    this.#log = log;
  }
  segment(segment: AudioSegment): Promise<FakeAudioBlock> {
    const block = new FakeAudioBlock(segment);
    this.blocks.push(block);
    this.#log.push(`audio ${segment.timestampUs / 1_000_000}`);
    return Promise.resolve(block);
  }
}

export class FakeAudioEncoder implements AudioEncoderPort<FakeAudioBlock> {
  readonly encoded: AudioSegment[] = [];
  closed = false;
  readonly #log: ExportLog;
  constructor(log: ExportLog) {
    this.#log = log;
  }
  encode(block: FakeAudioBlock): void {
    if (block.closed) {
      throw new Error("the audio block was closed before it was encoded");
    }
    this.encoded.push(block.segment);
    this.#log.push("encode audio");
  }
  flush(): Promise<void> {
    this.#log.push("flush audio");
    return Promise.resolve();
  }
  close(): void {
    this.closed = true;
    this.#log.push("close audio");
  }
}

export class FakeMuxer implements MuxerPort {
  readonly #log: ExportLog;
  #writes = 0;
  #failure: { readonly atWrite: number; readonly error: Error } | null = null;
  constructor(log: ExportLog) {
    this.#log = log;
  }
  /** The `atWrite`-th call of `written` (from 1) and every later one reject with `error`. */
  failWrittenAt(atWrite: number, error: Error): void {
    this.#failure = { atWrite, error };
  }
  written(): Promise<void> {
    this.#writes += 1;
    return this.#failure !== null && this.#writes >= this.#failure.atWrite
      ? Promise.reject(this.#failure.error)
      : Promise.resolve();
  }
  finalize(): Promise<void> {
    this.#log.push("finalize");
    return Promise.resolve();
  }
  cancel(): Promise<void> {
    this.#log.push("cancel muxer");
    return Promise.resolve();
  }
}

export class FakeSink implements FileSink {
  readonly #log: ExportLog;
  constructor(log: ExportLog) {
    this.#log = log;
  }
  discard(): Promise<void> {
    this.#log.push("discard file");
    return Promise.resolve();
  }
}
