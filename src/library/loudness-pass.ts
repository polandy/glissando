import type { MusicLoudness } from "../loudness";
import {
  LoudnessMeterGoneError,
  MusicUnmeasurableError,
  type LoudnessMeter,
} from "./loudness-meter";
import type { LibraryStore } from "./library-store";
import { MediaNotFoundError } from "./library-store";

export interface LoudnessPassPorts {
  readonly store: Pick<
    LibraryStore,
    "listSlideshows" | "musicLoudness" | "musicBlob" | "putMusicLoudness"
  >;
  readonly meter: LoudnessMeter;
  /** A measurement failed for one track: logged, the pass carries on. */
  log(error: unknown): void;
  /** An unexpected error, or the meter gone (told once; later passes log it), ended the pass. */
  reportError(error: unknown): void;
}

export interface LoudnessPassState {
  readonly running: boolean;
  /** The music the pass will still measure, the track in flight included, by music id. */
  readonly listening: ReadonlySet<string>;
  /** Every result the pass stored since the app opened, by music id. */
  readonly found: ReadonlyMap<string, MusicLoudness>;
  /** The music this device could not decode, by music id, until its loudness is found after all. */
  readonly undecodable: ReadonlySet<string>;
}

/** The meter failed on one track; it is measured again on the next pass. */
export class LoudnessMeasurementFailedError extends Error {
  constructor(
    readonly musicId: string,
    cause: unknown,
  ) {
    super(`measuring the loudness of music "${musicId}" failed`, { cause });
    this.name = "LoudnessMeasurementFailedError";
  }
}

const IDLE: LoudnessPassState = {
  running: false,
  listening: new Set(),
  found: new Map(),
  undecodable: new Set(),
};

/**
 * Measures, in the background, the loudness of every stored track that has none yet (ADR-0040):
 * one track at a time, its file through the meter into the store. Music deleted meanwhile is
 * skipped; a track whose measurement fails is logged and left for the next pass, and marked
 * undecodable when that is why. A meter gone ends the pass, the rest left for the next.
 */
export class LoudnessPass {
  readonly #ports: LoudnessPassPorts;
  readonly #listeners = new Set<(state: LoudnessPassState) => void>();
  #state = IDLE;
  #queue: string[] = [];
  /** Music asked for by `listenFor`, not yet taken up. */
  #asked: string[] = [];
  /** Music taken up in this pass, so a rescan neither queues it twice nor retries a failure. */
  readonly #takenUp = new Set<string>();
  #rescanRequested = false;
  #isRunning = false;
  /** A gone meter stays gone: told once, as every later pass meets it again. */
  #goneReported = false;
  #running: Promise<void> = Promise.resolve();

  constructor(ports: LoudnessPassPorts) {
    this.#ports = ports;
  }

  get state(): LoudnessPassState {
    return this.#state;
  }

  /** The Svelte store contract: called now with the current state, then on every change. */
  subscribe(listener: (state: LoudnessPassState) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  }

  /**
   * Starts a pass over every stored slideshow's music; while one runs, it takes up the music
   * added since it started instead, so two never run at once.
   */
  start(): void {
    this.#rescanRequested = true;
    this.#runIfIdle();
  }

  /**
   * Measures the one track next, unless its loudness is stored or this pass took it up already:
   * the slideshow opened goes ahead of the rest.
   */
  listenFor(musicId: string): void {
    this.#asked.push(musicId);
    this.#runIfIdle();
  }

  #runIfIdle(): void {
    if (!this.#isRunning) {
      this.#isRunning = true;
      this.#publish({ running: true });
      this.#running = this.#run();
    }
  }

  /** Resolves once the pass has ended; its errors went to `reportError`. */
  settled(): Promise<void> {
    return this.#running;
  }

  async #run(): Promise<void> {
    try {
      while (this.#rescanRequested || this.#asked.length > 0 || this.#queue.length > 0) {
        if (this.#asked.length > 0) {
          await this.#takeUpAsked();
          continue;
        }
        if (this.#rescanRequested) {
          this.#rescanRequested = false;
          await this.#scan();
          continue;
        }
        const musicId = this.#queue.shift() as string;
        await this.#measure(musicId);
        this.#publish({ listening: new Set(this.#queue) });
      }
    } catch (error) {
      if (error instanceof LoudnessMeterGoneError && this.#goneReported) {
        this.#ports.log(error);
      } else {
        this.#goneReported ||= error instanceof LoudnessMeterGoneError;
        this.#ports.reportError(error);
      }
    } finally {
      this.#queue = [];
      this.#asked = [];
      this.#takenUp.clear();
      this.#isRunning = false;
      this.#publish({ running: false, listening: new Set() });
    }
  }

  /** Queues every track without a result that this pass has not taken up yet, newest slideshow first. */
  async #scan(): Promise<void> {
    const slideshows = await this.#ports.store.listSlideshows();
    const musicIds = new Set(slideshows.flatMap((show) => show.songs.map((song) => song.id)));
    for (const musicId of musicIds) {
      if (this.#takenUp.has(musicId) || (await this.#ports.store.musicLoudness(musicId))) {
        continue;
      }
      this.#takenUp.add(musicId);
      this.#queue.push(musicId);
    }
    this.#publish({ listening: new Set(this.#queue) });
  }

  /** Puts the music asked for ahead of the queue, the latest asked first. */
  async #takeUpAsked(): Promise<void> {
    const asked = this.#asked;
    this.#asked = [];
    for (const musicId of asked) {
      const queued = this.#queue.includes(musicId);
      if (
        !queued &&
        (this.#takenUp.has(musicId) || (await this.#ports.store.musicLoudness(musicId)))
      ) {
        continue;
      }
      this.#takenUp.add(musicId);
      this.#queue = [musicId, ...this.#queue.filter((id) => id !== musicId)];
    }
    this.#publish({ listening: new Set(this.#queue) });
  }

  async #measure(musicId: string): Promise<void> {
    let music: Blob;
    try {
      music = await this.#ports.store.musicBlob(musicId);
    } catch (error) {
      if (error instanceof MediaNotFoundError) {
        return;
      }
      throw error;
    }
    let loudness: MusicLoudness;
    try {
      loudness = await this.#ports.meter.measure(music);
    } catch (error) {
      if (error instanceof LoudnessMeterGoneError) {
        // Every later measurement would fail alike: the pass ends, the rest waits for the next.
        throw error;
      }
      this.#ports.log(new LoudnessMeasurementFailedError(musicId, error));
      if (error instanceof MusicUnmeasurableError) {
        this.#publish({ undecodable: new Set(this.#state.undecodable).add(musicId) });
      }
      return;
    }
    // The store keeps nothing for music deleted meanwhile.
    await this.#ports.store.putMusicLoudness(musicId, loudness);
    const undecodable = new Set(this.#state.undecodable);
    undecodable.delete(musicId);
    this.#publish({ found: new Map(this.#state.found).set(musicId, loudness), undecodable });
  }

  #publish(change: Partial<LoudnessPassState>): void {
    this.#state = { ...this.#state, ...change };
    for (const listener of this.#listeners) {
      listener(this.#state);
    }
  }
}
