import {
  MILLISECONDS_PER_SECOND,
  musicGainAt,
  type Clock,
  type FrameScheduler,
  type MusicEnvelope,
  type MusicPlayback,
} from "../../player";
import { decibelsToGain, loudestStretchStartMs, type MusicLoudness } from "../../loudness";

/** "Listen to the start", "listen to the end" of the excerpt, or "listen at this volume". */
export type ListenKind = "start" | "end" | "volume";

/** How much of the excerpt each listen plays. */
export const LISTEN_PREVIEW_MS = 8 * MILLISECONDS_PER_SECOND;

/** What plays: track times in ms. */
export interface ListenRange {
  readonly fromMs: number;
  readonly toMs: number;
}

/** A listen under way; `positionMs` is where the playhead is in the track. */
export interface ListenState {
  readonly kind: ListenKind;
  readonly positionMs: number;
  /** Only for `"volume"`: the original file plays, at gain 1, instead of the resolved gain. */
  readonly original?: boolean;
}

/** The music must reach the end of the envelope it was resolved to. */
export type ListenTiming = MusicEnvelope & { readonly endMs: number };

/** What the Volume section's "Listen" plays: the excerpt's loudest stretch, at a fixed gain. */
export interface VolumeListenPlan extends ListenRange {
  /** The song's resolved gain, linear (levelling and its own volume together). */
  readonly gain: number;
}

export interface VolumeListenInput {
  readonly startMs: number;
  readonly endMs: number;
  /** `null` while the song's loudness is not known yet: the loudest stretch is the excerpt's start. */
  readonly loudness: MusicLoudness | null;
  /** The song's resolved gain in dB (`SongLevel.gainDb`). */
  readonly gainDb: number;
}

export interface ListenPorts {
  readonly clock: Clock;
  readonly frames: FrameScheduler;
  readonly music: MusicPlayback;
  readonly onError: (error: unknown) => void;
}

/** The start's first seconds with the fade-in, or the last before the audible end. */
export function listenRange(kind: "start" | "end", timing: ListenTiming): ListenRange {
  return kind === "start"
    ? { fromMs: timing.startMs, toMs: Math.min(timing.endMs, timing.startMs + LISTEN_PREVIEW_MS) }
    : { fromMs: Math.max(timing.startMs, timing.endMs - LISTEN_PREVIEW_MS), toMs: timing.endMs };
}

/**
 * What the Volume section's "Listen" plays (dev-docs/app/MUSIC_EDITOR.md "Volume"): the excerpt's
 * loudest {@link LISTEN_PREVIEW_MS}, at the song's resolved gain.
 */
export function volumeListenPlan({
  startMs,
  endMs,
  loudness,
  gainDb,
}: VolumeListenInput): VolumeListenPlan {
  const fromMs =
    loudness === null
      ? startMs
      : loudestStretchStartMs(loudness, startMs, endMs, LISTEN_PREVIEW_MS);
  return {
    fromMs,
    toMs: Math.min(endMs, fromMs + LISTEN_PREVIEW_MS),
    gain: decibelsToGain(gainDb),
  };
}

type Playing =
  | {
      readonly kind: "start" | "end";
      readonly range: ListenRange;
      readonly timing: ListenTiming;
      readonly startedAtMs: number;
    }
  | {
      readonly kind: "volume";
      readonly range: ListenRange;
      readonly volumeGain: number;
      original: boolean;
      readonly startedAtMs: number;
    };

/**
 * Plays a listen through the music port, with a playhead from the injected clock. One listen at
 * a time; it stops by itself at its end. "Start" and "end" follow the fade envelope, as the
 * player will; "volume" plays at a fixed gain, which {@link ListenPreview.setOriginal} can swap
 * for gain 1 without losing its place.
 */
export class ListenPreview {
  readonly #ports: ListenPorts;
  readonly #onChange: (state: ListenState | null) => void;
  #playing: Playing | null = null;
  #frame: number | null = null;
  #started: Promise<void> = Promise.resolve();

  constructor(ports: ListenPorts, onChange: (state: ListenState | null) => void) {
    this.#ports = ports;
    this.#onChange = onChange;
  }

  /** Starts "start" or "end", or stops it when it is the one playing. */
  toggle(kind: "start" | "end", timing: ListenTiming): void {
    const wasPlaying = this.#playing?.kind === kind;
    this.stop();
    if (!wasPlaying) {
      this.#startEnvelope(kind, timing);
    }
  }

  /** Starts "volume" at `plan`'s gain, or stops it when "volume" is the one playing. */
  toggleVolume(plan: VolumeListenPlan): void {
    const wasPlaying = this.#playing?.kind === "volume";
    this.stop();
    if (!wasPlaying) {
      this.#startVolume(plan, false);
    }
  }

  /** Replaces whatever plays with "volume" on `plan` — for switching songs while listening. */
  replaceVolume(plan: VolumeListenPlan, original: boolean): void {
    this.stop();
    this.#startVolume(plan, original);
  }

  /** Swaps the resolved gain for gain 1 (or back), without restarting or losing the position. */
  setOriginal(original: boolean): void {
    const playing = this.#playing;
    if (playing === null || playing.kind !== "volume" || playing.original === original) {
      return;
    }
    playing.original = original;
    this.#ports.music.setVolume(original ? 1 : playing.volumeGain);
    this.#onChange({ kind: "volume", positionMs: this.#positionMs(playing), original });
  }

  stop(): void {
    if (this.#playing === null) {
      return;
    }
    this.#playing = null;
    if (this.#frame !== null) {
      this.#ports.frames.cancel(this.#frame);
      this.#frame = null;
    }
    this.#ports.music.pause();
    this.#onChange(null);
  }

  /** Resolves once the latest start was accepted or reported as refused. */
  settled(): Promise<void> {
    return this.#started;
  }

  dispose(): void {
    this.stop();
    this.#ports.music.dispose();
  }

  #startEnvelope(kind: "start" | "end", timing: ListenTiming): void {
    const range = listenRange(kind, timing);
    const playing: Playing = { kind, range, timing, startedAtMs: this.#ports.clock.now() };
    this.#playing = playing;
    this.#ports.music.setVolume(musicGainAt(timing, range.fromMs - timing.startMs));
    this.#play(range.fromMs, playing);
  }

  #startVolume(plan: VolumeListenPlan, original: boolean): void {
    const playing: Playing = {
      kind: "volume",
      range: plan,
      volumeGain: plan.gain,
      original,
      startedAtMs: this.#ports.clock.now(),
    };
    this.#playing = playing;
    this.#ports.music.setVolume(original ? 1 : plan.gain);
    this.#play(plan.fromMs, playing);
  }

  #play(fromMs: number, playing: Playing): void {
    this.#started = this.#ports.music
      .play(fromMs / MILLISECONDS_PER_SECOND)
      .catch((error: unknown) => {
        if (this.#playing === playing) {
          this.stop();
        }
        this.#ports.onError(error);
      });
    this.#tick();
  }

  #positionMs(playing: Playing): number {
    return playing.range.fromMs + (this.#ports.clock.now() - playing.startedAtMs);
  }

  #tick(): void {
    const playing = this.#playing;
    if (playing === null) {
      return;
    }
    const positionMs = this.#positionMs(playing);
    if (positionMs >= playing.range.toMs) {
      this.stop();
      return;
    }
    this.#ports.music.setVolume(
      playing.kind === "volume"
        ? playing.original
          ? 1
          : playing.volumeGain
        : musicGainAt(playing.timing, positionMs - playing.timing.startMs),
    );
    this.#onChange(
      playing.kind === "volume"
        ? { kind: "volume", positionMs, original: playing.original }
        : { kind: playing.kind, positionMs },
    );
    this.#frame = this.#ports.frames.request(() => {
      this.#frame = null;
      this.#tick();
    });
  }
}
