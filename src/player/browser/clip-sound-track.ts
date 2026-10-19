import { MILLISECONDS_PER_SECOND } from "../slideshow";
import type { AudioBufferSourceNodeLike, ClipSoundOutput, GainNodeLike } from "./music-output";

/**
 * A clip's sound is restarted once it drifts from the slide clock by more than this: small
 * enough that a restart is rare, large enough that ordinary Web Audio scheduling jitter never
 * causes one.
 */
export const CLIP_SOUND_RESYNC_MS = 100;

/**
 * One video clip's sound, decoded ahead into an `AudioBuffer` and played by an
 * `AudioBufferSourceNode` on the music's `AudioContext` clock instead of the muted `<video>`
 * element (ADR-0035): iOS and iPadOS let only one media element with sound play at a time, and
 * would pause the music for good once an audible clip started. `play`/`follow`/`stop` mirror the
 * clip's own lifecycle; the slide clock leads, this track only catches up or restarts.
 *
 * Without Web Audio (`output` null) the clip stays silent for its life: there is nowhere to
 * connect its sound to, and the muted `<video>` already carries the picture on its own.
 */
export class ClipSoundTrack {
  readonly #output: ClipSoundOutput | null;
  readonly #endMs: number;
  readonly #gain: GainNodeLike | null;
  /** Undefined until the decode settles; null once it failed or the clip has no sound track. */
  #decoded: AudioBuffer | null | undefined;
  #source: AudioBufferSourceNodeLike | null = null;
  #startedAtContextTime = 0;
  #startedAtClipMs = 0;
  /** Whether the clip is meant to be playing; distinct from `#source`, which needs a decoded buffer. */
  #playing = false;
  #disposed = false;

  constructor(decoded: Promise<AudioBuffer | null>, output: ClipSoundOutput | null, endMs: number) {
    this.#output = output;
    this.#endMs = endMs;
    this.#gain = output === null ? null : output.context.createGain();
    if (output !== null && this.#gain !== null) {
      this.#gain.connect(output.destination);
    }
    // Only a state flag: the decode settling never starts playback itself, so a clip stopped
    // before it resolves stays silent instead of starting late (no race on the order of events).
    void decoded.then((buffer) => {
      if (this.#disposed) {
        return;
      }
      this.#decoded = buffer;
    });
  }

  /** Starts (or restarts) the clip's sound at `clipMs`; silent until its buffer is decoded. */
  play(clipMs: number): void {
    this.#playing = true;
    this.#stopSource();
    this.#startIfNeeded(clipMs);
  }

  /**
   * Catches the sound up with the slide clock: starts it if it was waiting on its decode, stops
   * it at `endMs`, and restarts it once its position drifts from `clipMs` by more than
   * `CLIP_SOUND_RESYNC_MS`.
   */
  follow(clipMs: number): void {
    if (!this.#playing) {
      return;
    }
    if (clipMs >= this.#endMs) {
      this.#stopSource();
      return;
    }
    if (this.#source === null) {
      this.#startIfNeeded(clipMs);
      return;
    }
    if (Math.abs(this.#positionMs() - clipMs) > CLIP_SOUND_RESYNC_MS) {
      this.#stopSource();
      this.#startIfNeeded(clipMs);
    }
  }

  /** Silences the clip, e.g. on pause or a seek while paused; `play` starts it again. */
  stop(): void {
    this.#playing = false;
    this.#stopSource();
  }

  setVolume(volume: number): void {
    if (this.#gain !== null && this.#output !== null) {
      this.#gain.gain.setValueAtTime(volume, this.#output.context.currentTime);
    }
  }

  dispose(): void {
    this.#disposed = true;
    this.#stopSource();
    this.#gain?.disconnect();
    this.#decoded = null;
  }

  #startIfNeeded(clipMs: number): void {
    const output = this.#output;
    const buffer = this.#decoded;
    if (output === null || this.#gain === null || buffer === null || buffer === undefined) {
      return;
    }
    if (clipMs >= this.#endMs) {
      return;
    }
    const source = output.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.#gain);
    const offsetSeconds = clipMs / MILLISECONDS_PER_SECOND;
    const durationSeconds = (this.#endMs - clipMs) / MILLISECONDS_PER_SECOND;
    source.start(output.context.currentTime, offsetSeconds, durationSeconds);
    this.#source = source;
    this.#startedAtContextTime = output.context.currentTime;
    this.#startedAtClipMs = clipMs;
  }

  #stopSource(): void {
    const source = this.#source;
    if (source === null) {
      return;
    }
    this.#source = null;
    // Safe even if the source already reached `endMs` on its own: stopping an ended source is a
    // no-op, not an error (only starting twice, or stopping before ever starting, throws).
    source.stop();
    source.disconnect();
  }

  /** The clip time the sound is at now: where it started, plus the context clock since then. */
  #positionMs(): number {
    const output = this.#output;
    if (output === null) {
      return this.#startedAtClipMs;
    }
    return (
      this.#startedAtClipMs +
      (output.context.currentTime - this.#startedAtContextTime) * MILLISECONDS_PER_SECOND
    );
  }
}
