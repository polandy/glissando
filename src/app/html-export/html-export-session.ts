import {
  DEFAULT_PAGE_SIZE,
  estimatePageBytes,
  pageFileName,
  type PageSizeId,
  type PageWeights,
} from "../../html-export/plan";
import { estimatedBytes, presetById, type PresetId } from "../../video-export";
import type {
  HtmlExportPorts,
  HtmlExportState,
  HtmlExportSubject,
  PageDelivery,
  PageDestination,
  PageEstimates,
} from "./html-export-state";

/** The video the choose state compares the page with. */
const COMPARED_VIDEO_PRESET: PresetId = "1080p";
const SHARE_DISMISSED = "AbortError";

/**
 * The web page export sheet's flow, from choosing a size to the finished file (HTML_EXPORT.md,
 * Sheet). Closing it cancels a running export, which aborts and so empties a picked file.
 */
export class HtmlExportSession {
  readonly #subject: HtmlExportSubject;
  readonly #ports: HtmlExportPorts;
  readonly #listeners = new Set<(state: HtmlExportState) => void>();
  readonly #closed = new AbortController();
  readonly #releaseOpened: (() => void)[] = [];
  #state: HtmlExportState = {
    kind: "choose",
    sizeId: DEFAULT_PAGE_SIZE,
    estimates: null,
    starting: false,
  };

  constructor(subject: HtmlExportSubject, ports: HtmlExportPorts) {
    this.#subject = subject;
    this.#ports = ports;
  }

  get state(): HtmlExportState {
    return this.#state;
  }

  get subject(): HtmlExportSubject {
    return this.#subject;
  }

  /** The 1080p video's rough size, which the choose state's bar compares the page with. */
  get videoBytes(): number {
    const { durationMs, withMusic } = this.#subject;
    return estimatedBytes(presetById(COMPARED_VIDEO_PRESET), durationMs, withMusic);
  }

  /** The listener gets the current state at once, then every change. */
  subscribe(listener: (state: HtmlExportState) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  }

  /** Reads the stored sizes for the estimates. */
  async open(): Promise<void> {
    let weights: PageWeights;
    try {
      weights = await this.#ports.weights();
    } catch (error: unknown) {
      this.#fail(error);
      return;
    }
    if (this.#state.kind === "choose") {
      this.#set({ ...this.#state, estimates: estimates(weights) });
    }
  }

  select(sizeId: PageSizeId): void {
    if (this.#state.kind === "choose" && !this.#state.starting) {
      this.#set({ ...this.#state, sizeId });
    }
  }

  /** "Webseite erstellen"; call it in the click, since the save picker needs its user gesture. */
  async start(): Promise<void> {
    const choice = this.#state;
    if (choice.kind !== "choose" || choice.starting) {
      return;
    }
    const fileName = pageFileName(this.#subject.title);
    let destination: PageDestination | null;
    if (this.#ports.canPickSaveFile()) {
      this.#set({ ...choice, starting: true });
      try {
        destination = await this.#ports.pickDestination(fileName);
      } catch (error: unknown) {
        this.#fail(error);
        return;
      }
    } else {
      destination = this.#ports.memoryDestination(fileName);
    }
    if (destination === null) {
      this.#set({ ...choice, starting: false });
      return;
    }
    if (!this.#closed.signal.aborted) {
      await this.#run(choice.sizeId, destination);
    }
  }

  /** "Teilen …" or "Herunterladen" for a page built in memory. */
  async deliver(): Promise<void> {
    const state = this.#state;
    if (state.kind !== "done") {
      return;
    }
    if (state.delivery === "download") {
      this.#ports.download(state.file);
    } else if (state.delivery === "share") {
      await this.#ports.share(state.file).catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === SHARE_DISMISSED)) {
          this.#ports.log(error);
        }
      });
    }
  }

  /** "Öffnen": the finished page in a new tab; call it in the click. */
  openPage(): void {
    if (this.#state.kind === "done") {
      this.#releaseOpened.push(this.#ports.openPage(this.#state.file));
    }
  }

  /**
   * Cancels a running export before its next picture. The URLs of opened pages are released;
   * a tab that has loaded its page keeps it.
   */
  close(): void {
    if (this.#closed.signal.aborted) {
      return;
    }
    this.#closed.abort();
    for (const release of this.#releaseOpened.splice(0)) {
      release();
    }
  }

  async #run(sizeId: PageSizeId, destination: PageDestination): Promise<void> {
    this.#set({
      kind: "running",
      sizeId,
      picturesDone: 0,
      pictureCount: this.#subject.pictureCount,
      bytesWritten: 0,
    });
    let file: File;
    try {
      await this.#ports.run({
        sizeId,
        sink: destination.sink,
        signal: this.#closed.signal,
        onProgress: (progress) => {
          if (this.#state.kind === "running") {
            this.#set({ ...this.#state, ...progress });
          }
        },
      });
      file = await destination.file();
    } catch (error: unknown) {
      // Only closing the sheet cancels, and a closed sheet shows nothing.
      if (!this.#closed.signal.aborted) {
        this.#fail(error);
      }
      return;
    }
    if (!this.#closed.signal.aborted) {
      this.#set({ kind: "done", sizeId, file, delivery: this.#delivery(destination, file) });
    }
  }

  #delivery(destination: PageDestination, file: File): PageDelivery {
    if (destination.kind === "picked") {
      return "saved";
    }
    return this.#ports.canShare(file) ? "share" : "download";
  }

  #fail(error: unknown): void {
    this.#ports.log(error);
    this.#set({ kind: "failed", error: error instanceof Error ? error : new Error(String(error)) });
  }

  #set(state: HtmlExportState): void {
    this.#state = state;
    for (const listener of this.#listeners) {
      listener(state);
    }
  }
}

function estimates(weights: PageWeights): PageEstimates {
  return {
    small: estimatePageBytes(weights, "small"),
    sharp: estimatePageBytes(weights, "sharp"),
    "4k": estimatePageBytes(weights, "4k"),
  };
}
