/** The parts of an element the fallback needs. */
export interface VolumeElement {
  volume: number;
}

export interface AudioNodeLike {
  connect(destination: AudioNodeLike): unknown;
  disconnect(): void;
}

export interface GainNodeLike extends AudioNodeLike {
  readonly gain: { setValueAtTime(value: number, startTime: number): unknown };
}

export interface AudioBufferSourceNodeLike extends AudioNodeLike {
  buffer: AudioBuffer | null;
  start(when?: number, offset?: number, duration?: number): void;
  stop(when?: number): void;
}

/** The parts of an `AudioContext` the music output uses. */
export interface MusicAudioContext<Element extends VolumeElement = HTMLMediaElement> {
  readonly currentTime: number;
  readonly state: string;
  readonly destination: AudioNodeLike;
  resume(): Promise<void>;
  createMediaElementSource(element: Element): AudioNodeLike;
  createGain(): GainNodeLike;
  createBufferSource(): AudioBufferSourceNodeLike;
}

/** What a video clip's sound needs from the music's Web Audio context, nothing about elements. */
export interface ClipSoundContext {
  readonly currentTime: number;
  createBufferSource(): AudioBufferSourceNodeLike;
  createGain(): GainNodeLike;
}

/** Where a clip's sound connects to; its context schedules it (`ClipSoundTrack`). */
export interface ClipSoundOutput {
  readonly context: ClipSoundContext;
  readonly destination: AudioNodeLike;
}

/** Makes the context; null or a throw where the browser has no Web Audio. */
export type CreateMusicAudioContext<Element extends VolumeElement> =
  () => MusicAudioContext<Element> | null;

/** The volume of one routed element, from 0 (silent) to 1 (as recorded). */
export interface MusicVolume {
  set(volume: number): void;
  /** Disconnects the element's nodes; the element itself stays the owner's. */
  dispose(): void;
}

const RUNNING = "running";

/**
 * Where the music sounds: through one Web Audio context per page, its volume on a gain node,
 * because iOS and iPadOS ignore a media element's `volume`. Where Web Audio is missing, the
 * element's own volume. See ADR-0009.
 */
export class MusicOutput<Element extends VolumeElement = HTMLMediaElement> {
  readonly #createContext: CreateMusicAudioContext<Element>;
  /** Undefined until first needed; null once Web Audio turned out unavailable. */
  #context: MusicAudioContext<Element> | null | undefined;

  constructor(createContext: CreateMusicAudioContext<Element>) {
    this.#createContext = createContext;
  }

  /**
   * Lets the context sound. iOS only allows that synchronously within a user gesture, so it is
   * called in the gesture that starts playback, before anything awaits.
   */
  unlock(): void {
    const context = this.#ensureContext();
    if (context !== null && context.state !== RUNNING) {
      // A refused resume leaves the context suspended; the next gesture tries again.
      context.resume().catch(() => undefined);
    }
  }

  /** Routes `element` to the speakers; an element can be routed once. */
  route(element: Element): MusicVolume {
    const context = this.#ensureContext();
    if (context === null) {
      return elementVolume(element);
    }
    const source = context.createMediaElementSource(element);
    const gainNode = context.createGain();
    source.connect(gainNode);
    gainNode.connect(context.destination);
    return {
      set: (volume) => gainNode.gain.setValueAtTime(volume, context.currentTime),
      dispose: () => {
        source.disconnect();
        gainNode.disconnect();
      },
    };
  }

  /**
   * The Web Audio node a video clip's sound connects to, and the context to schedule it on
   * (`ClipSoundTrack`); the same context and master as the music, so a mute silences both. Null
   * where Web Audio is unavailable, same as `route`'s fallback.
   */
  clipSoundOutput(): ClipSoundOutput | null {
    const context = this.#ensureContext();
    return context === null ? null : { context, destination: context.destination };
  }

  #ensureContext(): MusicAudioContext<Element> | null {
    if (this.#context === undefined) {
      this.#context = createOrNull(this.#createContext);
    }
    return this.#context;
  }
}

function createOrNull<Element extends VolumeElement>(
  createContext: CreateMusicAudioContext<Element>,
): MusicAudioContext<Element> | null {
  try {
    return createContext();
  } catch {
    // Explicitly the element-volume fallback: the music still plays, only fades are lost on iOS.
    return null;
  }
}

function elementVolume(element: VolumeElement): MusicVolume {
  return {
    set: (volume) => {
      element.volume = volume;
    },
    dispose: () => undefined,
  };
}
