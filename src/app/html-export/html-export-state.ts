import type { PageExportProgress } from "../../html-export/export-page";
import type { PageWeights, PageSizeId } from "../../html-export/plan";
import type { PageSink } from "../../html-export/ports";

/** Where the page is written: a file the user picked, streamed, or a Blob held in memory. */
export interface PageDestination {
  readonly kind: "picked" | "memory";
  readonly sink: PageSink;
  /** The finished page; only once the run has closed the sink. */
  file(): Promise<File>;
}

/** One export as the sheet starts it. */
export interface PageRun {
  readonly sizeId: PageSizeId;
  readonly sink: PageSink;
  readonly signal: AbortSignal;
  onProgress(progress: PageExportProgress): void;
}

/** What the sheet needs of the browser and the export (HTML_EXPORT.md, Sheet). */
export interface HtmlExportPorts {
  /** The stored pictures' sizes and bytes, the music's and the page's own, for the estimate. */
  weights(): Promise<PageWeights>;
  canPickSaveFile(): boolean;
  /** Asks where to save; null when the user dismissed the picker. */
  pickDestination(fileName: string): Promise<PageDestination | null>;
  memoryDestination(fileName: string): PageDestination;
  /** Writes the page and closes the sink; on a failure or cancel it rejects, the sink aborted. */
  run(job: PageRun): Promise<void>;
  canShare(file: File): boolean;
  /** Rejects with an "AbortError" when the user dismissed the share sheet. */
  share(file: File): Promise<void>;
  download(file: File): void;
  /** Opens the page in a new tab; call it in the click. Returns what releases its URL. */
  openPage(file: File): () => void;
  /** An error the sheet shows in its own words. */
  log(error: unknown): void;
}

/** The slideshow being exported. */
export interface HtmlExportSubject {
  readonly title: string;
  readonly durationMs: number;
  readonly withMusic: boolean;
  readonly pictureCount: number;
  /** A server slideshow's pictures, downloaded from Immich only as the page is made. */
  readonly picturesFromImmich: boolean;
}

/** How a finished page reaches the user: already saved, the share sheet or a download. */
export type PageDelivery = "saved" | "share" | "download";

export type PageEstimates = Readonly<Record<PageSizeId, number>>;

export type HtmlExportState =
  | {
      readonly kind: "choose";
      readonly sizeId: PageSizeId;
      /** Null until the stored sizes were read. */
      readonly estimates: PageEstimates | null;
      /** "Webseite erstellen" was pressed; the picker is open. */
      readonly starting: boolean;
    }
  | {
      readonly kind: "running";
      readonly sizeId: PageSizeId;
      readonly picturesDone: number;
      readonly pictureCount: number;
      readonly bytesWritten: number;
    }
  | {
      readonly kind: "done";
      readonly sizeId: PageSizeId;
      readonly file: File;
      readonly delivery: PageDelivery;
    }
  | { readonly kind: "failed"; readonly error: Error };
