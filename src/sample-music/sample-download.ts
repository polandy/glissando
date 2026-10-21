import { sha256 } from "./sha256.ts";
import { sampleTrackUrl, type SampleTrack } from "./sample-tracks.ts";

/** What a download needs from a response; the real fetch's Response satisfies this. */
export interface SampleDownloadResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly body: ReadableStream<Uint8Array> | null;
}

export type SampleDownloadFetch = (
  url: string,
  init: { readonly signal?: AbortSignal | undefined },
) => Promise<SampleDownloadResponse>;

/** Where downloadSampleTrack gets its network access, so a test can inject a hand-written fake. */
export interface SampleDownloadPorts {
  readonly fetch: SampleDownloadFetch;
}

export type SampleDownloadResult =
  | { readonly kind: "success"; readonly bytes: Uint8Array }
  | { readonly kind: "network"; readonly cause: unknown }
  | { readonly kind: "httpStatus"; readonly status: number }
  | {
      readonly kind: "sizeMismatch";
      readonly expectedBytes: number;
      readonly receivedBytes: number;
    }
  | {
      readonly kind: "hashMismatch";
      readonly expectedSha256: string;
      readonly actualSha256: string;
    }
  | { readonly kind: "aborted" };

/**
 * Fetches `track` from `baseUrl`, reporting received/total bytes to `onProgress` as it streams,
 * then checks the result against the catalogue's size and SHA-256 before returning it
 * (ADR-0042). The catalogue's `bytes` is the authority, never Content-Length, which a compressed
 * transfer sets to its own size; reading stops once the body outgrows it.
 */
export async function downloadSampleTrack(
  track: SampleTrack,
  baseUrl: string,
  ports: SampleDownloadPorts,
  onProgress: (receivedBytes: number, totalBytes: number) => void,
  signal?: AbortSignal,
): Promise<SampleDownloadResult> {
  let response: SampleDownloadResponse;
  try {
    response = await ports.fetch(sampleTrackUrl(baseUrl, track.id), { signal });
  } catch (error) {
    return signal?.aborted ? { kind: "aborted" } : { kind: "network", cause: error };
  }

  if (!response.ok) return { kind: "httpStatus", status: response.status };

  let received: Uint8Array | "aborted";
  try {
    received = await readBody(response.body, track.bytes, signal, (receivedBytes) =>
      onProgress(receivedBytes, track.bytes),
    );
  } catch (error) {
    return signal?.aborted ? { kind: "aborted" } : { kind: "network", cause: error };
  }
  if (received === "aborted") return { kind: "aborted" };

  if (received.length !== track.bytes) {
    return { kind: "sizeMismatch", expectedBytes: track.bytes, receivedBytes: received.length };
  }

  const actualSha256 = toBase64(sha256(received));
  if (actualSha256 !== track.sha256) {
    return { kind: "hashMismatch", expectedSha256: track.sha256, actualSha256 };
  }

  return { kind: "success", bytes: received };
}

/**
 * Reads `body` to the end or until it holds more than `maxBytes`, or stops and reports "aborted"
 * as soon as `signal` fires.
 */
async function readBody(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
  signal: AbortSignal | undefined,
  onReceived: (receivedBytes: number) => void,
): Promise<Uint8Array | "aborted"> {
  if (body === null) return new Uint8Array(0);
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;
  // A real ReadableStream ends with `done`; this never spins without one ending the loop.
  for (;;) {
    if (signal?.aborted) return "aborted";
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    receivedBytes += value.length;
    onReceived(receivedBytes);
    if (signal?.aborted) return "aborted";
    if (receivedBytes > maxBytes) {
      await reader.cancel();
      break;
    }
  }
  const result = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
