import { describe, expect, it } from "vitest";
import { downloadSampleTrack, type SampleDownloadResponse } from "./sample-download.ts";
import type { SampleTrack } from "./sample-tracks.ts";

const BASE_URL = "https://example.com/music/";

// Small enough to type out by hand; not the real catalogue's sizes or hashes.
function fakeTrack(overrides: Partial<SampleTrack> = {}): SampleTrack {
  return {
    id: "hold-the-frame",
    title: "Hold the Frame",
    durationMs: 1000,
    bytes: 6,
    sha256: "cZI4XDwGBd5Vu5R2zh2QdIGQ7LMqju1/UgezDPah/ok=", // sha256([1,2,3,4,5,6]) in base64
    ...overrides,
  };
}

function bodyOf(...chunks: readonly Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

function response(overrides: Partial<SampleDownloadResponse> = {}): SampleDownloadResponse {
  return {
    ok: true,
    status: 200,
    body: bodyOf(new Uint8Array([1, 2, 3, 4, 5, 6])),
    ...overrides,
  };
}

describe("downloadSampleTrack", () => {
  it("streams the body, reports progress and checks size and hash", async () => {
    const progress: Array<readonly [number, number]> = [];
    const result = await downloadSampleTrack(
      fakeTrack(),
      BASE_URL,
      {
        fetch: async () =>
          response({ body: bodyOf(new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])) }),
      },
      (receivedBytes, totalBytes) => progress.push([receivedBytes, totalBytes]),
    );
    expect(progress).toEqual([
      [3, 6],
      [6, 6],
    ]);
    expect(result).toEqual({ kind: "success", bytes: new Uint8Array([1, 2, 3, 4, 5, 6]) });
  });

  it("stops reading as soon as more bytes arrive than the catalogue's size", async () => {
    let pulls = 0;
    const endless = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1;
        controller.enqueue(new Uint8Array(4));
      },
    });
    const result = await downloadSampleTrack(
      fakeTrack(),
      BASE_URL,
      { fetch: async () => response({ body: endless }) },
      () => undefined,
    );
    expect(result).toEqual({ kind: "sizeMismatch", expectedBytes: 6, receivedBytes: 8 });
    expect(pulls).toBeLessThan(5);
  });

  it("reports a network failure when the body breaks off mid-stream", async () => {
    const cause = new TypeError("connection reset");
    const broken = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]));
        controller.error(cause);
      },
    });
    const result = await downloadSampleTrack(
      fakeTrack(),
      BASE_URL,
      { fetch: async () => response({ body: broken }) },
      () => undefined,
    );
    expect(result).toEqual({ kind: "network", cause });
  });

  it("fails when the downloaded bytes do not hash to the catalogue's SHA-256", async () => {
    const track = fakeTrack({ bytes: 3, sha256: "wrong-hash-base64-placeholder=" });
    const result = await downloadSampleTrack(
      track,
      BASE_URL,
      { fetch: async () => response({ body: bodyOf(new Uint8Array([9, 9, 9])) }) },
      () => undefined,
    );
    expect(result).toEqual({
      kind: "hashMismatch",
      expectedSha256: "wrong-hash-base64-placeholder=",
      actualSha256: expect.stringContaining("="),
    });
  });

  it("fails loud on an HTTP status that is not ok", async () => {
    const result = await downloadSampleTrack(
      fakeTrack(),
      BASE_URL,
      { fetch: async () => response({ ok: false, status: 404, body: null }) },
      () => undefined,
    );
    expect(result).toEqual({ kind: "httpStatus", status: 404 });
  });

  it("reports a network failure when fetch itself rejects", async () => {
    const networkError = new TypeError("fetch failed");
    const result = await downloadSampleTrack(
      fakeTrack(),
      BASE_URL,
      {
        fetch: async () => {
          throw networkError;
        },
      },
      () => undefined,
    );
    expect(result).toEqual({ kind: "network", cause: networkError });
  });

  it("stops at the caller's abort instead of finishing the download", async () => {
    const controller = new AbortController();
    const result = await downloadSampleTrack(
      fakeTrack(),
      BASE_URL,
      {
        fetch: async () =>
          response({ body: bodyOf(new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])) }),
      },
      (receivedBytes) => {
        if (receivedBytes === 3) controller.abort();
      },
      controller.signal,
    );
    expect(result).toEqual({ kind: "aborted" });
  });
});
