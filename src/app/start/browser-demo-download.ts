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

/** The `Content-Encoding` under which Content-Length counts the bytes the body yields. */
const IDENTITY_ENCODING = "identity";

/**
 * Streams the response, reporting bytes received against Content-Length as they arrive. Under a
 * content encoding (GitHub Pages gzips the demo) Content-Length counts the encoded bytes, so the
 * total reported never drops below the bytes received; without one, a body that ends short of
 * it is a download cut short and rejects.
 */
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
      const encoding = response.headers.get("content-encoding") ?? IDENTITY_ENCODING;
      const blob = await readBody(response.body.getReader(), total, onProgress);
      if (encoding === IDENTITY_ENCODING && total !== null && blob.size < total) {
        throw new Error(`the demo download ended after ${blob.size} of ${total} bytes`);
      }
      return blob;
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
      onProgress(received, total === null ? null : Math.max(total, received));
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
