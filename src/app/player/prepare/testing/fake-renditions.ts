/** One request for a picture's rendition, answered by the test. */
export interface RenditionRequest {
  readonly id: string;
  readonly signal: AbortSignal;
  answer(): void;
  fail(error: unknown): void;
}

/**
 * A rendition source the test answers one request at a time; `request(n)` settles once the n-th
 * request (from 0) has been made, so a test waits on the preparing itself, never on time.
 */
export class FakeRenditions {
  readonly requests: RenditionRequest[] = [];
  readonly #arrivals: ((request: RenditionRequest) => void)[] = [];
  readonly #arrived: Promise<RenditionRequest>[] = [];

  readonly prepare = (id: string, signal: AbortSignal): Promise<Blob> =>
    new Promise<Blob>((resolve, reject) => {
      const request: RenditionRequest = {
        id,
        signal,
        answer: () => resolve(new Blob([`rendition ${id}`])),
        fail: reject,
      };
      signal.addEventListener("abort", () => reject(signal.reason as Error));
      this.requests.push(request);
      this.#settle(this.requests.length - 1, request);
    });

  request(index: number): Promise<RenditionRequest> {
    this.#ensure(index);
    const arrived = this.#arrived[index];
    if (arrived === undefined) throw new Error(`no latch for request ${String(index)}`);
    return arrived;
  }

  #settle(index: number, request: RenditionRequest): void {
    this.#ensure(index);
    this.#arrivals[index]?.(request);
  }

  #ensure(index: number): void {
    while (this.#arrived.length <= index) {
      this.#arrived.push(new Promise<RenditionRequest>((resolve) => this.#arrivals.push(resolve)));
    }
  }
}

/** A clock the test moves by hand, in milliseconds. */
export class ManualClock {
  #now = 0;
  readonly now = (): number => this.#now;
  advance(milliseconds: number): void {
    this.#now += milliseconds;
  }
}
