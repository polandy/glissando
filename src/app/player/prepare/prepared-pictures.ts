import { PictureMissingFromImmichError } from "../../../server-library/server-slideshow-store";

/** Reads a picture's rendition as the player shows it; `signal` cancels it. */
export type PrepareRendition = (id: string, signal: AbortSignal) => Promise<Blob>;

/** The pictures the time per picture is averaged over: recent enough to follow the Wi-Fi. */
const RECENT_PICTURES_TIMED = 4;
const MILLISECONDS_PER_SECOND = 1000;

export interface PreparedPicturesOptions {
  /** The pictures in the order they play. */
  readonly ids: readonly string[];
  readonly prepare: PrepareRendition;
  /** Monotonic milliseconds. */
  readonly clock: () => number;
  /** Prepared pictures held at most; preparing ahead pauses until a slide has passed. */
  readonly capacity: number;
  /** Called after every picture prepared, missing or failed. */
  readonly onChange: () => void;
}

type Entry =
  | { readonly kind: "ready"; readonly blob: Blob }
  | { readonly kind: "missing"; readonly error: PictureMissingFromImmichError }
  | { readonly kind: "failed"; readonly error: unknown };

interface Waiter {
  resolve(blob: Blob): void;
  reject(error: unknown): void;
}

/**
 * Server pictures prepared one after another in play order and kept as encoded renditions,
 * bounded and released once their slide has passed (ADR-0027). The player opens its pictures
 * here; one asked for out of order is prepared next. Every preparation is timed.
 */
export class PreparedPictures {
  readonly #options: PreparedPicturesOptions;
  readonly #entries = new Map<string, Entry>();
  readonly #waiters = new Map<string, Waiter[]>();
  readonly #durationsMs: number[] = [];
  readonly #closed = new AbortController();
  #wanted: string[] = [];
  /** The first picture whose slide has not passed. */
  #current = 0;
  #working = false;
  /** A failure other than a missing picture: preparing ahead stops, asking still tries. */
  #failure: unknown = null;

  constructor(options: PreparedPicturesOptions) {
    this.#options = options;
  }

  start(): void {
    this.#work();
  }

  /** The picture's rendition, once prepared; rejects as preparing it did. */
  open(id: string): Promise<Blob> {
    const entry = this.#entries.get(id);
    if (entry?.kind === "ready") return Promise.resolve(entry.blob);
    if (entry?.kind === "missing") return Promise.reject(entry.error);
    if (entry?.kind === "failed") {
      this.#entries.delete(id);
      return Promise.reject(entry.error);
    }
    if (this.#closed.signal.aborted) return Promise.reject(this.#closed.signal.reason);
    return new Promise<Blob>((resolve, reject) => {
      this.#waiters.set(id, [...(this.#waiters.get(id) ?? []), { resolve, reject }]);
      this.#wanted.push(id);
      this.#work();
    });
  }

  /** `id`'s slide is on screen: the pictures before it are released. */
  passed(id: string): void {
    const index = this.#options.ids.indexOf(id);
    if (index === -1) return;
    this.#current = index;
    for (const earlier of this.#options.ids.slice(0, index)) {
      if (this.#entries.get(earlier)?.kind === "ready") this.#entries.delete(earlier);
    }
    this.#work();
  }

  isReady(id: string): boolean {
    return this.#entries.get(id)?.kind === "ready";
  }

  /** The pictures ready one after another from the current one, the missing ones left out. */
  readyInOrder(): number {
    let ready = 0;
    for (const id of this.#options.ids.slice(this.#current)) {
      const kind = this.#entries.get(id)?.kind;
      if (kind === "missing") continue;
      if (kind !== "ready") break;
      ready += 1;
    }
    return ready;
  }

  missing(): ReadonlySet<string> {
    const ids = [...this.#entries].filter(([, entry]) => entry.kind === "missing");
    return new Set(ids.map(([id]) => id));
  }

  /** The moving average over the recently prepared pictures; null before the first. */
  secondsPerPicture(): number | null {
    const recent = this.#durationsMs.slice(-RECENT_PICTURES_TIMED);
    if (recent.length === 0) return null;
    const total = recent.reduce((sum, duration) => sum + duration, 0);
    return total / recent.length / MILLISECONDS_PER_SECOND;
  }

  failure(): unknown {
    return this.#failure;
  }

  /** Cancels the picture under way and every open; the renditions are released. */
  close(): void {
    this.#closed.abort();
    this.#entries.clear();
    for (const waiters of this.#waiters.values()) {
      for (const waiter of waiters) waiter.reject(this.#closed.signal.reason);
    }
    this.#waiters.clear();
  }

  #work(): void {
    if (this.#working) return;
    this.#working = true;
    void this.#prepareInTurn();
  }

  async #prepareInTurn(): Promise<void> {
    for (let id = this.#next(); id !== null; id = this.#next()) {
      await this.#prepareOne(id);
      if (this.#closed.signal.aborted) return;
      this.#options.onChange();
    }
    this.#working = false;
  }

  #next(): string | null {
    if (this.#closed.signal.aborted) return null;
    this.#wanted = this.#wanted.filter((id) => !this.#entries.has(id));
    const wanted = this.#wanted[0];
    if (wanted !== undefined) return wanted;
    if (this.#failure !== null || this.#held() >= this.#options.capacity) return null;
    return this.#options.ids.slice(this.#current).find((id) => !this.#entries.has(id)) ?? null;
  }

  #held(): number {
    return [...this.#entries.values()].filter((entry) => entry.kind === "ready").length;
  }

  async #prepareOne(id: string): Promise<void> {
    const { prepare, clock } = this.#options;
    const started = clock();
    try {
      const blob = await prepare(id, this.#closed.signal);
      if (this.#closed.signal.aborted) return;
      this.#durationsMs.push(clock() - started);
      this.#failure = null;
      this.#settle(id, { kind: "ready", blob });
    } catch (error) {
      if (this.#closed.signal.aborted) return;
      if (error instanceof PictureMissingFromImmichError) {
        this.#settle(id, { kind: "missing", error });
      } else {
        this.#failure = error;
        this.#settle(id, { kind: "failed", error });
      }
    }
  }

  #settle(id: string, entry: Entry): void {
    const waiters = this.#waiters.get(id) ?? [];
    this.#waiters.delete(id);
    // A failure reaches whoever waited for the picture; kept, it answers the next open once.
    if (entry.kind !== "failed" || waiters.length === 0) this.#entries.set(id, entry);
    for (const waiter of waiters) {
      if (entry.kind === "ready") waiter.resolve(entry.blob);
      else waiter.reject(entry.error);
    }
  }
}
