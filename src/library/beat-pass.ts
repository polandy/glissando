import type { MusicBeats } from "../beats";
import { BeatDetectorGoneError, MusicUndecodableError, type BeatDetector } from "./beat-detector";
import { MediaNotFoundError, type LibraryStore } from "./stored-slideshow";

export interface BeatPassPorts {
  readonly store: Pick<
    LibraryStore,
    "listSlideshows" | "musicBeats" | "musicBlob" | "putMusicBeats"
  >;
  readonly detector: BeatDetector;
  /** A detection failed for one track: logged, the pass carries on. */
  log(error: unknown): void;
  /** An unexpected error, or the detector gone, ended the pass. */
  reportError(error: unknown): void;
}

export interface BeatPassState {
  readonly running: boolean;
  /** The music the pass will still listen to, the track in flight included, by music id. */
  readonly listening: ReadonlySet<string>;
  /** Every result the pass stored since the app opened, by music id. */
  readonly found: ReadonlyMap<string, MusicBeats>;
  /** The music this device could not decode, by music id, until its beats are found after all. */
  readonly undecodable: ReadonlySet<string>;
}

/** The detector failed on one track; it is listened to again on the next pass. */
export class BeatDetectionFailedError extends Error {
  constructor(
    readonly musicId: string,
    cause: unknown,
  ) {
    super(`finding the beats of music "${musicId}" failed`, { cause });
    this.name = "BeatDetectionFailedError";
  }
}

const IDLE: BeatPassState = {
  running: false,
  listening: new Set(),
  found: new Map(),
  undecodable: new Set(),
};

/**
 * Listens, in the background, for the beats of every stored track that has no result yet
 * (ADR-0021): one track at a time, its file through the detector into the store. Music deleted
 * meanwhile is skipped; a track whose detection fails is logged and left for the next pass, and
 * marked undecodable when that is why. A detector gone ends the pass, the rest left for the next.
 */
export class BeatPass {
  readonly #ports: BeatPassPorts;
  readonly #listeners = new Set<(state: BeatPassState) => void>();
  #state = IDLE;
  #queue: string[] = [];
  /** Music asked for by `listenFor`, not yet taken up. */
  #asked: string[] = [];
  /** Music taken up in this pass, so a rescan neither queues it twice nor retries a failure. */
  readonly #takenUp = new Set<string>();
  #rescanRequested = false;
  #isRunning = false;
  #running: Promise<void> = Promise.resolve();

  constructor(ports: BeatPassPorts) {
    this.#ports = ports;
  }

  get state(): BeatPassState {
    return this.#state;
  }

  /** The Svelte store contract: called now with the current state, then on every change. */
  subscribe(listener: (state: BeatPassState) => void): () => void {
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
   * Listens to the one track next, unless its beats are stored or this pass took it up already:
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
        await this.#listenTo(musicId);
        this.#publish({ listening: new Set(this.#queue) });
      }
    } catch (error) {
      this.#ports.reportError(error);
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
    const musicIds = new Set(slideshows.flatMap((show) => (show.music ? [show.music.id] : [])));
    for (const musicId of musicIds) {
      if (this.#takenUp.has(musicId) || (await this.#ports.store.musicBeats(musicId))) {
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
        (this.#takenUp.has(musicId) || (await this.#ports.store.musicBeats(musicId)))
      ) {
        continue;
      }
      this.#takenUp.add(musicId);
      this.#queue = [musicId, ...this.#queue.filter((id) => id !== musicId)];
    }
    this.#publish({ listening: new Set(this.#queue) });
  }

  async #listenTo(musicId: string): Promise<void> {
    let music: Blob;
    try {
      music = await this.#ports.store.musicBlob(musicId);
    } catch (error) {
      if (error instanceof MediaNotFoundError) {
        return;
      }
      throw error;
    }
    let beats: MusicBeats;
    try {
      beats = await this.#ports.detector.detect(music);
    } catch (error) {
      if (error instanceof BeatDetectorGoneError) {
        // Every later detection would fail alike: the pass ends, the rest waits for the next.
        throw error;
      }
      this.#ports.log(new BeatDetectionFailedError(musicId, error));
      if (error instanceof MusicUndecodableError) {
        this.#publish({ undecodable: new Set(this.#state.undecodable).add(musicId) });
      }
      return;
    }
    // The store keeps nothing for music deleted meanwhile.
    await this.#ports.store.putMusicBeats(musicId, beats);
    const undecodable = new Set(this.#state.undecodable);
    undecodable.delete(musicId);
    this.#publish({ found: new Map(this.#state.found).set(musicId, beats), undecodable });
  }

  #publish(change: Partial<BeatPassState>): void {
    this.#state = { ...this.#state, ...change };
    for (const listener of this.#listeners) {
      listener(this.#state);
    }
  }
}
