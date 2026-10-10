import type { PageSink } from "../ports";

/** The page's MIME type. */
export const PAGE_TYPE = "text/html";

/** The part of a picked file (`ExportTarget`) the page is streamed into. */
export interface StreamTarget {
  /** Opens the file for writing from its start. */
  open(): Promise<WritableStream>;
}

const utf8 = new TextEncoder();

/**
 * Streams the page into a picked file, so even a 4K page is never held in memory whole. An abort
 * only aborts the writer: File System Access writes into a swap file that only `close()` commits,
 * so the picked file keeps what it held before.
 */
export function streamPageSink(target: StreamTarget): PageSink {
  let writer: WritableStreamDefaultWriter | undefined;
  const opened = async () => (writer ??= (await target.open()).getWriter());
  return {
    write: async (text) => (await opened()).write(utf8.encode(text)),
    close: async () => (await opened()).close(),
    abort: async () => writer?.abort(),
  };
}

/** Collects the page as one Blob, for a browser that cannot stream into a picked file. */
export class MemoryBlobSink implements PageSink {
  readonly #parts: Blob[] = [];
  #state: "writing" | "closed" | "aborted" = "writing";

  write(text: string): Promise<void> {
    if (this.#state !== "writing") {
      return Promise.reject(new Error(`the page sink is ${this.#state}; write before close`));
    }
    // One Blob per part lets the browser keep the page out of the JavaScript heap.
    this.#parts.push(new Blob([text]));
    return Promise.resolve();
  }

  close(): Promise<void> {
    this.#state = "closed";
    return Promise.resolve();
  }

  abort(): Promise<void> {
    this.#state = "aborted";
    this.#parts.length = 0;
    return Promise.resolve();
  }

  /** The written page; only once closed. */
  blob(): Blob {
    if (this.#state !== "closed") {
      const state = this.#state === "writing" ? "not closed yet" : "aborted";
      throw new Error(`the page sink is ${state}; the page exists only once the export closed it`);
    }
    return new Blob(this.#parts, { type: PAGE_TYPE });
  }
}
