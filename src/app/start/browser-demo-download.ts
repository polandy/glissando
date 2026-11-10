import type { DemoDownloadPort } from "./demo-slideshow-flow";

/** A chunk reader shaped like `ReadableStreamDefaultReader<Uint8Array>`. */
interface DemoStreamReader {
  read(): Promise<{ readonly done: boolean; readonly value: Uint8Array | undefined }>;
}

/** The part of `Response` the download reads; matches `window.fetch`'s own return type. */
export interface DemoFetchResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly headers: { get(name: string): string | null };
  readonly body: { getReader(): DemoStreamReader } | null;
  blob(): Promise<Blob>;
}

export type DemoFetch = (url: string) => Promise<DemoFetchResponse>;

/** Streams the response, reporting bytes received against Content-Length as they arrive. */
export function browserDemoDownload(fetchDemo: DemoFetch): DemoDownloadPort {
  return {
    async download(url, onProgress) {
      const response = await fetchDemo(url);
      if (!response.ok) {
        throw new Error(`downloading the demo failed: ${response.status} ${response.statusText}`);
      }
      const total = parseContentLength(response.headers.get("content-length"));
      if (response.body === null) {
        const blob = await response.blob();
        onProgress(blob.size, total);
        return blob;
      }
      return readBody(response.body.getReader(), total, onProgress);
    },
  };
}

async function readBody(
  reader: DemoStreamReader,
  total: number | null,
  onProgress: (received: number, total: number | null) => void,
): Promise<Blob> {
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (value !== undefined) {
      chunks.push(value);
      received += value.byteLength;
      onProgress(received, total);
    }
  }
  return new Blob(chunks as BlobPart[]);
}

function parseContentLength(header: string | null): number | null {
  if (header === null) {
    return null;
  }
  const value = Number(header);
  return Number.isFinite(value) && value >= 0 ? value : null;
}
