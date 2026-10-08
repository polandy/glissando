import {
  exportSlideshow,
  glissandoFileName,
  type ExportMedia,
} from "../../glissando-file/export-slideshow";
import type { LibraryStore } from "../../library/stored-slideshow";
import type { Toaster } from "../toast/toaster";
import { isStorageShortage } from "./storage-shortage";

/** The export running in the background: which slideshow and how far it got. */
export interface ExportProgress {
  readonly slideshowId: string;
  readonly title: string;
  /** From 0 to 1. */
  readonly fraction: number;
}

export interface ExportJobPorts {
  readonly store: Pick<LibraryStore, "getSlideshow"> & ExportMedia;
  /** Hands the finished file to the browser's downloads. */
  download(file: Blob, fileName: string): void;
  readonly toaster: Pick<Toaster, "show">;
  reportError(error: unknown): void;
  log(error: unknown): void;
  now(): Date;
  downloadedText(fileName: string, bytes: number): string;
  failedText(): string;
  tryAgainLabel(): string;
}

/**
 * Exports one slideshow at a time in the background while the app stays usable; the header
 * shows its progress. It ends in a download and a toast; a device out of storage or memory
 * offers to try again, any other failure is reported as unexpected.
 */
export class ExportJob {
  readonly #ports: ExportJobPorts;
  readonly #listeners = new Set<(progress: ExportProgress | null) => void>();
  #running: ExportProgress | null = null;
  /** Set from the start, before the slideshow is read and its progress published. */
  #busy = false;
  #settled: Promise<void> = Promise.resolve();

  constructor(ports: ExportJobPorts) {
    this.#ports = ports;
  }

  get running(): ExportProgress | null {
    return this.#running;
  }

  subscribe(listener: (progress: ExportProgress | null) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#running);
    return () => this.#listeners.delete(listener);
  }

  /** Resolves once the export started last has ended, whichever way. */
  settled(): Promise<void> {
    return this.#settled;
  }

  /** Never rejects; a start while an export runs does nothing. */
  start(slideshowId: string): Promise<void> {
    if (!this.#busy) {
      this.#busy = true;
      this.#settled = this.#run(slideshowId).finally(() => (this.#busy = false));
    }
    return this.#settled;
  }

  async #run(slideshowId: string): Promise<void> {
    const ports = this.#ports;
    try {
      const slideshow = await ports.store.getSlideshow(slideshowId);
      this.#publish({ slideshowId, title: slideshow.title, fraction: 0 });
      const file = await exportSlideshow(slideshow, ports.store, {
        modifiedAt: ports.now(),
        onProgress: (fraction) => this.#publish({ slideshowId, title: slideshow.title, fraction }),
      });
      const fileName = glissandoFileName(slideshow.title);
      this.#publish(null);
      ports.download(file, fileName);
      ports.toaster.show({ text: ports.downloadedText(fileName, file.size), tone: "info" });
    } catch (error) {
      this.#publish(null);
      if (!isStorageShortage(error)) {
        ports.reportError(error);
        return;
      }
      ports.log(error);
      ports.toaster.show({
        text: ports.failedText(),
        tone: "error",
        action: { label: ports.tryAgainLabel(), run: () => void this.start(slideshowId) },
      });
    }
  }

  #publish(progress: ExportProgress | null): void {
    this.#running = progress;
    for (const listener of this.#listeners) {
      listener(progress);
    }
  }
}
