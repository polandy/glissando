import type { SlideshowSearch } from "./focus-pass-types";

interface Progress {
  readonly pending: Set<string>;
  total: number;
  withRecord: number;
}

/**
 * Queue order, dedup and per-slideshow progress bookkeeping for `FocusPass`: which pictures it has
 * taken up this pass, which still wait, which one is in flight, and how far each slideshow is.
 */
export class FocusPassQueue {
  #queue: string[] = [];
  readonly #queued = new Set<string>();
  #inFlight: string | null = null;
  /** Pictures taken up in this pass, so a rescan neither queues them twice nor retries them. */
  readonly #takenUp = new Set<string>();
  readonly #progress = new Map<string, Progress>();
  /** Pending `lookAgain` requests, each a batch of picture ids taken up ahead of the queue. */
  #forcedRequests: string[][] = [];
  #rescanRequested = false;

  requestRescan(): void {
    this.#rescanRequested = true;
  }

  requestLookAgain(pictureIds: readonly string[]): void {
    this.#forcedRequests.push([...pictureIds]);
  }

  get hasWork(): boolean {
    return this.#forcedRequests.length > 0 || this.#rescanRequested || this.#queue.length > 0;
  }

  /** Nothing queued or forced, but a rescan was asked for: the next step is a scan. */
  get needsScan(): boolean {
    return this.#forcedRequests.length === 0 && this.#queue.length === 0 && this.#rescanRequested;
  }

  takeForcedRequest(): string[] | undefined {
    return this.#forcedRequests.shift();
  }

  clearRescanRequest(): void {
    this.#rescanRequested = false;
  }

  takenUpAlready(pictureId: string): boolean {
    return this.#takenUp.has(pictureId);
  }

  isInFlight(pictureId: string): boolean {
    return this.#inFlight === pictureId;
  }

  /** Adds a picture a background scan found outdated to the back of the queue. */
  enqueueBackground(slideshowId: string, pictureId: string, hadRecord: boolean): void {
    this.#takenUp.add(pictureId);
    this.addToProgress(slideshowId, pictureId, hadRecord);
    this.#queue.push(pictureId);
    this.#queued.add(pictureId);
  }

  addToProgress(slideshowId: string, pictureId: string, hadRecord: boolean): void {
    const progress = this.#progress.get(slideshowId) ?? {
      pending: new Set(),
      total: 0,
      withRecord: 0,
    };
    if (progress.pending.has(pictureId)) {
      return;
    }
    progress.pending.add(pictureId);
    progress.total += 1;
    if (hadRecord) {
      progress.withRecord += 1;
    }
    this.#progress.set(slideshowId, progress);
  }

  /** Brings pictures asked for by `lookAgain` to the queue's front, in the order given. */
  bringToFront(pictureIds: readonly string[]): void {
    for (let index = pictureIds.length - 1; index >= 0; index--) {
      const id = pictureIds[index] as string;
      this.#takenUp.add(id);
      this.#queue = this.#queue.filter((queued) => queued !== id);
      this.#queue.unshift(id);
      this.#queued.add(id);
    }
  }

  /** Takes the next picture off the queue's front and marks it in flight. */
  beginNext(): string | undefined {
    const pictureId = this.#queue.shift();
    if (pictureId === undefined) {
      return undefined;
    }
    this.#queued.delete(pictureId);
    this.#inFlight = pictureId;
    return pictureId;
  }

  endCurrent(): void {
    this.#inFlight = null;
  }

  /** Puts a picture back at the queue's front, for a `pausesOn` error to retry it on resume. */
  requeueFront(pictureId: string): void {
    this.#queue.unshift(pictureId);
    this.#queued.add(pictureId);
  }

  markDone(pictureId: string): void {
    for (const [slideshowId, progress] of this.#progress) {
      progress.pending.delete(pictureId);
      if (progress.pending.size === 0) {
        this.#progress.delete(slideshowId);
      }
    }
  }

  progressSnapshot(): { slideshows: Map<string, SlideshowSearch>; searching: Set<string> } {
    const slideshows = new Map<string, SlideshowSearch>();
    const searching = new Set<string>();
    for (const [slideshowId, { pending, total, withRecord }] of this.#progress) {
      slideshows.set(slideshowId, {
        done: total - pending.size,
        total,
        again: withRecord === total,
      });
      pending.forEach((id) => searching.add(id));
    }
    return { slideshows, searching };
  }

  /** Clears every pending picture and progress, for the pass ending without a pause. */
  reset(): void {
    this.#queue = [];
    this.#queued.clear();
    this.#takenUp.clear();
    this.#progress.clear();
    this.#forcedRequests = [];
  }
}
