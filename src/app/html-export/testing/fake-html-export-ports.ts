import type { PageWeights } from "../../../html-export/plan";
import { FakeScaler, fixedPlayerAsset, MemoryPageSink } from "../../../html-export/testing/fakes";
import type { HtmlExportPorts, PageDestination, PageRun } from "../html-export-state";
import type { HtmlExportDevice } from "../slideshow-html-export";

export interface FakeDestination extends PageDestination {
  readonly sink: MemoryPageSink;
  readonly fileName: string;
}

export function fakeDestination(kind: PageDestination["kind"], fileName: string): FakeDestination {
  const sink = new MemoryPageSink();
  return {
    kind,
    fileName,
    sink,
    file: () => Promise.resolve(new File([sink.text], fileName, { type: "text/html" })),
  };
}

/** Hand-written ports: each records what it was asked and settles when the test says so. */
export class FakeHtmlExportPorts implements HtmlExportPorts {
  weightsResult: PageWeights = {
    pictures: [{ width: 3840, height: 2160, bytes: 3_000_000 }],
    musicBytes: 0,
    pageBytes: 0,
  };
  weightsError: Error | null = null;
  pickerAvailable = false;
  /** What the picker answers; null is a dismissal. */
  picked: FakeDestination | null = null;
  readonly pickedNames: string[] = [];
  readonly memoryDestinations: FakeDestination[] = [];
  sharable = false;
  readonly shared: File[] = [];
  readonly downloaded: File[] = [];
  shareError: Error | null = null;
  readonly opened: File[] = [];
  released = 0;
  readonly logged: unknown[] = [];
  readonly runs: PageRun[] = [];
  readonly #outcomes: PromiseWithResolvers<undefined>[] = [];
  #runStarted = Promise.withResolvers<PageRun>();
  #runsClaimed = 0;

  weights(): Promise<PageWeights> {
    return this.weightsError === null
      ? Promise.resolve(this.weightsResult)
      : Promise.reject(this.weightsError);
  }
  canPickSaveFile(): boolean {
    return this.pickerAvailable;
  }
  pickDestination(fileName: string): Promise<PageDestination | null> {
    this.pickedNames.push(fileName);
    return Promise.resolve(this.picked);
  }
  memoryDestination(fileName: string): PageDestination {
    const destination = fakeDestination("memory", fileName);
    this.memoryDestinations.push(destination);
    return destination;
  }
  run(job: PageRun): Promise<void> {
    this.runs.push(job);
    const outcome = Promise.withResolvers<undefined>();
    this.#outcomes.push(outcome);
    this.#runStarted.resolve(job);
    this.#runStarted = Promise.withResolvers();
    return outcome.promise;
  }
  /**
   * Settles once the session has started an export not claimed yet (it may already have); the
   * run's job, to report progress on.
   */
  nextRun(): Promise<PageRun> {
    const started = this.runs[this.#runsClaimed];
    if (started !== undefined) {
      this.#runsClaimed += 1;
      return Promise.resolve(started);
    }
    return this.#runStarted.promise.then((job) => {
      this.#runsClaimed += 1;
      return job;
    });
  }
  /** The latest run writes the page and closes its sink, as `exportPage` does. */
  async finishRun(page = "<!doctype html>"): Promise<void> {
    const job = this.runs.at(-1);
    if (job === undefined) {
      throw new Error("no run to finish; start one first");
    }
    await job.sink.write(page);
    await job.sink.close();
    this.#outcomes.at(-1)?.resolve(undefined);
  }
  /** The latest run fails, its sink aborted, as `exportPage` does. */
  async failRun(error: unknown): Promise<void> {
    await this.runs.at(-1)?.sink.abort();
    this.#outcomes.at(-1)?.reject(error);
  }
  canShare(): boolean {
    return this.sharable;
  }
  share(file: File): Promise<void> {
    this.shared.push(file);
    return this.shareError === null ? Promise.resolve() : Promise.reject(this.shareError);
  }
  download(file: File): void {
    this.downloaded.push(file);
  }
  openPage(file: File): () => void {
    this.opened.push(file);
    return () => {
      this.released += 1;
    };
  }
  log(error: unknown): void {
    this.logged.push(error);
  }
}

/** The fake ports as the browser device: with a fake scaler and a fixed player bundle. */
export function fakeHtmlExportDevice(
  ports = new FakeHtmlExportPorts(),
): FakeHtmlExportPorts & HtmlExportDevice {
  return Object.assign(ports, { scaler: new FakeScaler(), playerAsset: fixedPlayerAsset() });
}
