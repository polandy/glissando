import { describe, expect, it } from "vitest";
import { sha256 } from "../../sample-music/sha256";
import { sampleFileName, sampleMediaId, type SampleTrack } from "../../sample-music/sample-tracks";
import { pickSampleTrack, type SampleSongPickPorts } from "./sample-song-pick";

const TRACK_BYTES = new TextEncoder().encode("the sample track's bytes");

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

const track: SampleTrack = {
  id: "hold-the-frame",
  title: "Hold the Frame",
  durationMs: 175_099,
  bytes: TRACK_BYTES.length,
  sha256: toBase64(sha256(TRACK_BYTES)),
};

function bodyOf(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

function portsWith(overrides: Partial<SampleSongPickPorts> = {}): SampleSongPickPorts {
  return {
    baseUrl: "https://assets.example/music/",
    fetch: () => Promise.resolve({ ok: true, status: 200, body: bodyOf(TRACK_BYTES) }),
    hasMusic: () => Promise.resolve(false),
    musicBlob: () => Promise.reject(new Error("not stored")),
    ...overrides,
  };
}

describe("pickSampleTrack", () => {
  it("reuses the device copy without fetching when the track is already stored", async () => {
    const stored = new Blob(["device copy"], { type: "audio/mpeg" });
    let fetched = false;
    const ports = portsWith({
      hasMusic: (id) => Promise.resolve(id === sampleMediaId(track.id)),
      musicBlob: () => Promise.resolve(stored),
      fetch: () => {
        fetched = true;
        return Promise.reject(new Error("must not fetch an on-device track"));
      },
    });

    const result = await pickSampleTrack(track, ports, () => {});

    expect(fetched).toBe(false);
    expect(result.kind).toBe("onDevice");
    if (result.kind !== "onDevice") throw new Error("unreachable");
    expect(result.file.name).toBe(sampleFileName(track));
    expect(result.file.type).toBe("audio/mpeg");
    expect(await result.file.text()).toBe("device copy");
  });

  it("downloads and checks the track when it is not on this device", async () => {
    const progress: number[] = [];
    const ports = portsWith();

    const result = await pickSampleTrack(track, ports, (fraction) => progress.push(fraction));

    expect(result.kind).toBe("downloaded");
    if (result.kind !== "downloaded") throw new Error("unreachable");
    expect(result.file.name).toBe(sampleFileName(track));
    expect(await result.file.text()).toBe("the sample track's bytes");
    expect(progress.at(-1)).toBe(1);
  });

  it("reports a failed download, other than hash or size mismatch, as failed", async () => {
    const ports = portsWith({
      fetch: () => Promise.resolve({ ok: false, status: 500, body: null }),
    });

    const result = await pickSampleTrack(track, ports, () => {});

    expect(result.kind).toBe("failed");
  });

  it("reports a hash mismatch as failed, never storing a tampered download", async () => {
    const ports = portsWith({
      fetch: () =>
        Promise.resolve({
          ok: true,
          status: 200,
          body: bodyOf(new TextEncoder().encode("tampered")),
        }),
    });

    const result = await pickSampleTrack(track, ports, () => {});

    expect(result.kind).toBe("failed");
  });

  it("reports an abort as aborted, never as a failure", async () => {
    const controller = new AbortController();
    const ports = portsWith({
      fetch: (_url, init) =>
        new Promise((_resolve, reject) => {
          if (init.signal?.aborted) {
            reject(new Error("aborted"));
            return;
          }
          init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    });
    const promise = pickSampleTrack(track, ports, () => {}, controller.signal);
    controller.abort();

    expect((await promise).kind).toBe("aborted");
  });
});
