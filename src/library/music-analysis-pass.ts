import {
  MusicAnalyserGoneError,
  MusicUndecodableError,
  type MusicAnalyser,
  type MusicAnalysis,
} from "./music-analyser";
import type { LibraryStore } from "./library-store";
import { MediaNotFoundError } from "./library-store";

export interface MusicAnalysisPassPorts {
  readonly store: Pick<
    LibraryStore,
    | "listSlideshows"
    | "musicBeats"
    | "musicLoudness"
    | "musicBlob"
    | "putMusicBeats"
    | "putMusicLoudness"
  >;
  readonly analyser: MusicAnalyser;
  /** An analysis failed for one track: logged, the pass carries on. */
  log(error: unknown): void;
  /** An unexpected error, or the analyser gone (told once; later passes log it), ended the pass. */
  reportError(error: unknown): void;
}

export interface MusicAnalysisPassState {
  readonly running: boolean;
  /** The music the pass will still analyse, the track in flight included, by music id. */
  readonly listening: ReadonlySet<string>;
  /** Every result the pass stored since the app opened, by music id. */
  readonly found: ReadonlyMap<string, MusicAnalysis>;
  /** The music this device could not decode, by music id, until its analysis succeeds after all. */
  readonly undecodable: ReadonlySet<string>;
}

/** The analyser failed on one track; it is analysed again on the next pass. */
export class MusicAnalysisFailedError extends Error {
  constructor(
    readonly musicId: string,
    cause: unknown,
  ) {
    super(`analysing music "${musicId}" failed`, { cause });
    this.name = "MusicAnalysisFailedError";
  }
}

const IDLE: MusicAnalysisPassState = {
  running: false,
  listening: new Set(),
  found: new Map(),
  undecodable: new Set(),
};

/**
 * Analyses, in the background, every stored track that lacks its beats or its loudness
 * (ADR-0021, ADR-0040, ADR-0051): one track at a time, its file through the analyser, both
 * results into the store. Music deleted meanwhile is skipped; a track whose analysis fails is
 * logged and left for the next pass, and marked undecodable when that is why. An analyser gone
 * ends the pass, the rest left for the next.
 */
export class MusicAnalysisPass {
  readonly #ports: MusicAnalysisPassPorts;
  readonly #listeners = new Set<(state: MusicAnalysisPassState) => void>();
  #state = IDLE;
  #queue: string[] = [];
  /** Music asked for by `listenFor`, not yet taken up. */
  #asked: string[] = [];
  /** Music taken up in this pass, so a rescan neither queues it twice nor retries a failure. */
  readonly #takenUp = new Set<string>();
  #rescanRequested = false;
  #isRunning = false;
  /** A gone analyser stays gone: told once, as every later pass meets it again. */
  #goneReported = false;
  #running: Promise<void> = Promise.resolve();

  constructor(ports: MusicAnalysisPassPorts) {
    this.#ports = ports;
  }

  get state(): MusicAnalysisPassState {
    return this.#state;
  }

  /** The Svelte store contract: called now with the current state, then on every change. */
  subscribe(listener: (state: MusicAnalysisPassState) => void): () => void {
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
   * Analyses the one track next, unless its beats and loudness are stored or this pass took it up already:
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
        await this.#analyse(musicId);
        this.#publish({ listening: new Set(this.#queue) });
      }
    } catch (error) {
      if (error instanceof MusicAnalyserGoneError && this.#goneReported) {
        this.#ports.log(error);
      } else {
        this.#goneReported ||= error instanceof MusicAnalyserGoneError;
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

  /** Queues every track lacking beats or loudness that this pass has not taken up yet, newest slideshow first. */
  async #scan(): Promise<void> {
    const slideshows = await this.#ports.store.listSlideshows();
    const musicIds = new Set(slideshows.flatMap((show) => show.songs.map((song) => song.id)));
    for (const musicId of musicIds) {
      if (this.#takenUp.has(musicId) || (await this.#isAnalysed(musicId))) {
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
      if (!queued && (this.#takenUp.has(musicId) || (await this.#isAnalysed(musicId)))) {
        continue;
      }
      this.#takenUp.add(musicId);
      this.#queue = [musicId, ...this.#queue.filter((id) => id !== musicId)];
    }
    this.#publish({ listening: new Set(this.#queue) });
  }

  async #analyse(musicId: string): Promise<void> {
    let music: Blob;
    try {
      music = await this.#ports.store.musicBlob(musicId);
    } catch (error) {
      if (error instanceof MediaNotFoundError) {
        return;
      }
      throw error;
    }
    let analysis: MusicAnalysis;
    try {
      analysis = await this.#ports.analyser.analyse(music);
    } catch (error) {
      if (error instanceof MusicAnalyserGoneError) {
        // Every later analysis would fail alike: the pass ends, the rest waits for the next.
        throw error;
      }
      this.#ports.log(new MusicAnalysisFailedError(musicId, error));
      if (error instanceof MusicUndecodableError) {
        this.#publish({ undecodable: new Set(this.#state.undecodable).add(musicId) });
      }
      return;
    }
    // The store keeps nothing for music deleted meanwhile.
    await this.#ports.store.putMusicBeats(musicId, analysis.beats);
    await this.#ports.store.putMusicLoudness(musicId, analysis.loudness);
    const undecodable = new Set(this.#state.undecodable);
    undecodable.delete(musicId);
    this.#publish({ found: new Map(this.#state.found).set(musicId, analysis), undecodable });
  }

  async #isAnalysed(musicId: string): Promise<boolean> {
    const { store } = this.#ports;
    return (
      (await store.musicBeats(musicId)) !== undefined &&
      (await store.musicLoudness(musicId)) !== undefined
    );
  }

  #publish(change: Partial<MusicAnalysisPassState>): void {
    this.#state = { ...this.#state, ...change };
    for (const listener of this.#listeners) {
      listener(this.#state);
    }
  }
}
