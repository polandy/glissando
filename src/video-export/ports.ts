import type { AudioSegment } from "./plan";

/** A frame or a block of audio, whose memory is freed by `close`. */
export interface Closable {
  close(): void;
}

export interface FrameTiming {
  readonly timestampUs: number;
  readonly durationUs: number;
}

/** Draws the slideshow at a time and captures it as one video frame. */
export interface FrameSource<Frame extends Closable> {
  frameAt(seconds: number, timing: FrameTiming): Promise<Frame>;
}

/** An encoder whose output goes to the muxer; a failure shows on the next call. */
export interface VideoEncoderPort<Frame> {
  /** Frames handed over but not yet encoded. */
  readonly encodeQueueSize: number;
  /** Resolves at the encoder's next dequeue; rejects once it has failed. */
  dequeued(): Promise<void>;
  encode(frame: Frame, options: { readonly keyFrame: boolean }): void;
  flush(): Promise<void>;
  /** Idempotent. */
  close(): void;
}

/** The music, rendered one segment at a time. */
export interface AudioSource<Block extends Closable> {
  segment(segment: AudioSegment): Promise<Block>;
}

export interface AudioEncoderPort<Block> {
  encode(block: Block): void;
  flush(): Promise<void>;
  /** Idempotent. */
  close(): void;
}

/** Writes the encoders' packets into the file. */
export interface MuxerPort {
  /** Resolves once every packet so far is handed to the file; rejects with a write's error. */
  written(): Promise<void>;
  /** Writes the index and closes the file. */
  finalize(): Promise<void>;
  cancel(): Promise<void>;
}

/** Where the file goes. */
export interface FileSink {
  /** Removes a private partial file; a picked file keeps what it held, its writer aborted. */
  discard(): Promise<void>;
}
