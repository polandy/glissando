import { describe, expect, it } from "vitest";
import { browserDemoDownload, type DemoFetch, type DemoFetchResponse } from "./browser-demo-download.ts";

/** A streamed body the test releases one chunk at a time. */
function fakeStream(chunks: readonly Uint8Array[]): DemoFetchResponse["body"] {
  let index = 0;
  return {
    getReader() {
      return {
        read() {
          if (index >= chunks.length) {
            return Promise.resolve({ done: true, value: undefined });
          }
          const value = chunks[index];
          index += 1;
          return Promise.resolve({ done: false, value });
        },
      };
    },
  };
}

function chunk(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function fakeFetch(response: Partial<DemoFetchResponse> & { readonly ok: boolean }): DemoFetch {
  return () =>
    Promise.resolve({
      status: 200,
      statusText: "OK",
      headers: { get: () => null },
      body: null,
      blob: () => Promise.resolve(new Blob()),
      ...response,
    });
}

describe("browserDemoDownload", () => {
  it("reports every chunk's running total against Content-Length, then resolves with the whole body", async () => {
    const seen: Array<{ received: number; total: number | null }> = [];
    const download = browserDemoDownload(
      fakeFetch({
        ok: true,
        headers: { get: (name) => (name === "content-length" ? "9" : null) },
        body: fakeStream([chunk("abc"), chunk("def"), chunk("ghi")]),
      }),
    );
    const blob = await download.download("https://example.invalid/demo.glissando", (received, total) =>
      seen.push({ received, total }),
    );
    expect(seen).toEqual([
      { received: 3, total: 9 },
      { received: 6, total: 9 },
      { received: 9, total: 9 },
    ]);
    expect(await blob.text()).toBe("abcdefghi");
  });

  it("reports a null total where Content-Length is absent or not a number", async () => {
    const seen: Array<number | null> = [];
    const download = browserDemoDownload(
      fakeFetch({ ok: true, headers: { get: () => "not-a-number" }, body: fakeStream([chunk("a")]) }),
    );
    await download.download("https://example.invalid/demo.glissando", (_received, total) =>
      seen.push(total),
    );
    expect(seen).toEqual([null]);
  });

  it("rejects on a non-2xx response, naming its status", async () => {
    const download = browserDemoDownload(
      fakeFetch({ ok: false, status: 404, statusText: "Not Found" }),
    );
    await expect(
      download.download("https://example.invalid/demo.glissando", () => {}),
    ).rejects.toThrow(/404/);
  });

  it("rejects where fetch itself rejects, e.g. offline mid-request", async () => {
    const download = browserDemoDownload(() => Promise.reject(new Error("network error")));
    await expect(
      download.download("https://example.invalid/demo.glissando", () => {}),
    ).rejects.toThrow("network error");
  });
});
