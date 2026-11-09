import { describe, expect, it } from "vitest";
import { probeMusic, UnreadableMusicError } from "./music-probe";
import { silentWav } from "./testing/silent-wav";

describe("probeMusic", () => {
  it("reports the duration of a track the browser can play", async () => {
    const file = new File([silentWav(1500)], "silence.wav", { type: "audio/wav" });

    expect(await probeMusic(file)).toEqual({ durationMs: 1500 });
  });

  it("rejects a file the browser cannot play with UnreadableMusicError", async () => {
    const file = new File(["not music at all"], "broken.mp3", { type: "audio/mpeg" });

    const error: unknown = await probeMusic(file).catch((rejected: unknown) => rejected);

    expect(error).toBeInstanceOf(UnreadableMusicError);
    expect((error as UnreadableMusicError).fileName).toBe("broken.mp3");
  });

  it("rejects with the abort reason when the signal aborts while it loads", async () => {
    const file = new File(["not music at all"], "stalled.mp3", { type: "audio/mpeg" });
    const controller = new AbortController();

    const probing = probeMusic(file, controller.signal).catch((rejected: unknown) => rejected);
    controller.abort(new DOMException("cancelled", "AbortError"));

    expect(await probing).toMatchObject({ name: "AbortError" });
  });
});
