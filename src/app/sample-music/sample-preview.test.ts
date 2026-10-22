import { describe, expect, it } from "vitest";
import { otherTrack, previewWith, track } from "./testing/sample-preview-fixtures";

describe("SamplePreview", () => {
  it("starts idle", () => {
    const { preview } = previewWith();
    expect(preview.state).toEqual({ kind: "idle" });
  });

  it("streams a track not on this device from the base URL", async () => {
    const { preview, audio, states } = previewWith();

    await preview.toggle(track);

    expect(audio.src).toBe("https://assets.example/music/hold-the-frame.mp3");
    expect(states.at(-1)).toEqual({ kind: "playing", trackId: "hold-the-frame", progress: 0 });
  });

  it("plays a track on this device from a blob URL, without streaming it", async () => {
    const stored = new Blob(["device copy"]);
    const { preview, audio, urls } = previewWith({
      hasMusic: (id) => Promise.resolve(id === "sample-hold-the-frame"),
      musicBlob: (id) =>
        id === "sample-hold-the-frame" ? Promise.resolve(stored) : Promise.reject(new Error("?")),
    });

    await preview.toggle(track);

    expect(audio.src).toBe(urls[0]);
    expect(audio.src.startsWith("blob:")).toBe(true);
  });

  it("reports loading, then playing, as the states a caller's listener sees in order", async () => {
    const { preview, states } = previewWith();

    await preview.toggle(track);

    expect(states).toEqual([
      { kind: "idle" },
      { kind: "loading", trackId: "hold-the-frame" },
      { kind: "playing", trackId: "hold-the-frame", progress: 0 },
    ]);
  });

  it("pauses the playing track on a second tap, keeping its progress", async () => {
    const { preview, audio, states } = previewWith();
    await preview.toggle(track);
    audio.currentTime = 25_000 / 1000;
    const pausedSoFar = audio.paused.length;

    await preview.toggle(track);

    expect(audio.paused.length).toBe(pausedSoFar + 1);
    expect(states.at(-1)).toEqual({ kind: "paused", trackId: "hold-the-frame", progress: 0.25 });
  });

  it("resumes a paused track on a third tap, without re-fetching it", async () => {
    const { preview, audio, states } = previewWith();
    await preview.toggle(track);
    await preview.toggle(track);

    await preview.toggle(track);

    expect(audio.played).toHaveLength(2);
    expect(states.at(-1)).toEqual({ kind: "playing", trackId: "hold-the-frame", progress: 0 });
  });

  it("stops the previous track and starts the new one when a different card is tapped", async () => {
    const { preview, audio, revoked, urls } = previewWith({
      hasMusic: (id) => Promise.resolve(id === "sample-hold-the-frame"),
      musicBlob: () => Promise.resolve(new Blob(["device copy"])),
    });
    await preview.toggle(track);
    const firstUrl = urls[0];

    await preview.toggle(otherTrack);

    expect(revoked).toContain(firstUrl);
    expect(audio.src).toBe("https://assets.example/music/morning-latitude.mp3");
  });

  it("reports progress from the track's duration as the audio element plays", async () => {
    const { preview, audio, states } = previewWith();
    await preview.toggle(track);

    audio.currentTime = 40_000 / 1000;
    audio.emit("timeupdate");

    expect(states.at(-1)).toEqual({ kind: "playing", trackId: "hold-the-frame", progress: 0.4 });
  });

  it("returns to idle, revoking the blob URL, when a device track ends", async () => {
    const { preview, audio, revoked, urls, states } = previewWith({
      hasMusic: () => Promise.resolve(true),
      musicBlob: () => Promise.resolve(new Blob(["device copy"])),
    });
    await preview.toggle(track);

    audio.emit("ended");

    expect(revoked).toEqual(urls);
    expect(states.at(-1)).toEqual({ kind: "idle" });
  });

  it("stops cleanly when nothing is playing", () => {
    const { preview, states } = previewWith();

    preview.stop();

    expect(states).toEqual([{ kind: "idle" }]);
  });
});
