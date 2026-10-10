import type { ExportCapabilities, ExportTarget, VideoExportResult } from "../../../video-export";
import type { ExportRun, VideoExportPorts } from "../export-sheet-state";

/** A preview stands in for the canvas the export draws on. */
export interface FakePreview {
  readonly frame: number;
}

export interface FakeTarget extends ExportTarget {
  discarded: number;
}

export function fakeTarget(kind: ExportTarget["kind"], fileName: string): FakeTarget {
  const target: FakeTarget = {
    kind,
    fileName,
    discarded: 0,
    open: () => Promise.reject(new Error("the session never opens the target itself")),
    file: () => Promise.resolve(new File(["mp4"], fileName)),
    discard: () => {
      target.discarded += 1;
      return Promise.resolve();
    },
  };
  return target;
}

/** Hand-written ports: each records what it was asked and resolves when the test says so. */
export class FakeExportPorts implements VideoExportPorts<FakePreview> {
  capabilities: ExportCapabilities = {
    supported: true,
    available: ["720p", "1080p", "4k"],
    defaultPreset: "1080p",
    audioCodec: "aac",
  };
  free: number | null = null;
  pickerAvailable = false;
  /** What the picker answers; null is a dismissal. */
  picked: FakeTarget | null = null;
  pickerError: Error | null = null;
  readonly pickedNames: string[] = [];
  readonly privateTargets: FakeTarget[] = [];
  sharable = false;
  readonly shared: File[] = [];
  readonly downloaded: File[] = [];
  shareError: Error | null = null;
  readonly logged: unknown[] = [];
  readonly runs: ExportRun<FakePreview>[] = [];
  awake = 0;
  readonly #results: ((result: VideoExportResult) => void)[] = [];
  #runStarted = Promise.withResolvers<ExportRun<FakePreview>>();

  probe(): Promise<ExportCapabilities> {
    return Promise.resolve(this.capabilities);
  }
  freeBytes(): Promise<number | null> {
    return Promise.resolve(this.free);
  }
  canPickSaveFile(): boolean {
    return this.pickerAvailable;
  }
  pickSaveTarget(fileName: string): Promise<ExportTarget | null> {
    this.pickedNames.push(fileName);
    return this.pickerError === null
      ? Promise.resolve(this.picked)
      : Promise.reject(this.pickerError);
  }
  privateExportTarget(fileName: string): Promise<ExportTarget> {
    const target = fakeTarget("private", fileName);
    this.privateTargets.push(target);
    return Promise.resolve(target);
  }
  run(job: ExportRun<FakePreview>): Promise<VideoExportResult> {
    this.runs.push(job);
    this.#runStarted.resolve(job);
    this.#runStarted = Promise.withResolvers();
    return new Promise((resolve) => this.#results.push(resolve));
  }
  /** Settles once the session has started an export; the run's job, to report progress on. */
  nextRun(): Promise<ExportRun<FakePreview>> {
    return this.#runStarted.promise;
  }
  /** Ends the latest run as the export would. */
  finish(result: VideoExportResult): void {
    const resolve = this.#results.at(-1);
    if (resolve === undefined) {
      throw new Error("no export is running");
    }
    resolve(result);
  }
  keepScreenAwake(): { release(): void } {
    this.awake += 1;
    return { release: () => (this.awake -= 1) };
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
  log(error: unknown): void {
    this.logged.push(error);
  }
}
