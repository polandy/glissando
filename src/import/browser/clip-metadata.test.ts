import { describe, expect, it } from "vitest";
import { loadClipMetadata, type ClipMetadataElement } from "./clip-metadata";

type Outcome = { readonly durationSeconds: number; readonly width: number } | "error";

/**
 * A `<video>` element as Safari drives it under `preload="metadata"`: once a source is set it
 * fires `loadedmetadata` (or `error`) and nothing more until a play or seek.
 */
class SafariLikeVideoElement implements ClipMetadataElement {
  preload: HTMLMediaElement["preload"] = "";
  onloadedmetadata: ((event: Event) => void) | null = null;
  onerror: ((event: Event | string) => void) | null = null;
  duration = Number.NaN;
  videoWidth = 0;
  #src = "";

  constructor(private readonly outcome: Outcome) {}

  get src(): string {
    return this.#src;
  }

  set src(url: string) {
    this.#src = url;
    queueMicrotask(() => {
      if (this.outcome === "error") {
        this.onerror?.(new Event("error"));
        return;
      }
      this.duration = this.outcome.durationSeconds;
      this.videoWidth = this.outcome.width;
      this.onloadedmetadata?.(new Event("loadedmetadata"));
    });
  }
}

const CLIP_URL = "blob:clip";

describe("loadClipMetadata", () => {
  it("settles at loadedmetadata, as Safari fires no loadeddata under preload=metadata", async () => {
    const video = new SafariLikeVideoElement({ durationSeconds: 11.386, width: 1920 });

    await expect(loadClipMetadata(video, CLIP_URL)).resolves.toEqual({
      durationMs: 11386,
      width: 1920,
    });
  });

  it("asks the element for the metadata only, never the whole clip", async () => {
    const video = new SafariLikeVideoElement({ durationSeconds: 1, width: 64 });

    await loadClipMetadata(video, CLIP_URL);

    expect(video.preload).toBe("metadata");
    expect(video.src).toBe(CLIP_URL);
  });

  it("resolves null when the element reports an error", async () => {
    const video = new SafariLikeVideoElement("error");

    await expect(loadClipMetadata(video, CLIP_URL)).resolves.toBeNull();
  });
});
