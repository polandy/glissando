import { describe, expect, it } from "vitest";
import { FakeAudio, FakeNetwork, previewWith, track } from "./testing/sample-preview-fixtures";

describe("SamplePreview, errors and connectivity", () => {
  it("returns to idle and signals a one-shot error when the audio element fails to load", async () => {
    const { preview, audio, states, errors } = previewWith();
    await preview.toggle(track);

    audio.emit("error");

    expect(states.at(-1)).toEqual({ kind: "idle" });
    expect(errors).toEqual([{ trackId: "hold-the-frame" }]);
  });

  it("ignores a stray error event after the preview was already stopped", async () => {
    const { preview, audio, errors } = previewWith();
    await preview.toggle(track);
    preview.stop();

    audio.emit("error");

    expect(errors).toEqual([]);
  });

  it("signals a one-shot error when the audio element refuses to play", async () => {
    const failure = new Error("autoplay refused");
    const refusingAudio = new FakeAudio();
    refusingAudio.playResult = () => Promise.reject(failure);
    const { preview, states, errors } = previewWith({
      createAudioElement: () => refusingAudio,
    });

    await preview.toggle(track);

    expect(states.at(-1)).toEqual({ kind: "idle" });
    expect(errors).toEqual([{ trackId: "hold-the-frame" }]);
  });

  it("reports a rejected play() to the onError port", async () => {
    const failure = new Error("autoplay refused");
    const refusingAudio = new FakeAudio();
    refusingAudio.playResult = () => Promise.reject(failure);
    const { preview, portErrors } = previewWith({
      createAudioElement: () => refusingAudio,
    });

    await preview.toggle(track);

    expect(portErrors).toEqual([failure]);
  });

  it("fails at once, without streaming, a track not on this device while offline", async () => {
    const offline = new FakeNetwork(false);
    const { preview, audio, states, errors } = previewWith({ network: offline });

    await preview.toggle(track);

    expect(audio.src).toBe("");
    expect(states.at(-1)).toEqual({ kind: "idle" });
    expect(errors).toEqual([{ trackId: "hold-the-frame" }]);
  });

  it("plays a track already on this device while offline", async () => {
    const offline = new FakeNetwork(false);
    const { preview, audio, states } = previewWith({
      network: offline,
      hasMusic: () => Promise.resolve(true),
      musicBlob: () => Promise.resolve(new Blob(["device copy"])),
    });

    await preview.toggle(track);

    expect(states.at(-1)?.kind).toBe("playing");
    expect(audio.src.startsWith("blob:")).toBe(true);
  });

  it("stops a streamed preview when the connection drops", async () => {
    const { preview, network, states } = previewWith();
    await preview.toggle(track);

    network.go(false);

    expect(states.at(-1)).toEqual({ kind: "idle" });
  });

  it("leaves a device preview playing when the connection drops", async () => {
    const { preview, network, states } = previewWith({
      hasMusic: () => Promise.resolve(true),
      musicBlob: () => Promise.resolve(new Blob(["device copy"])),
    });
    await preview.toggle(track);

    network.go(false);

    expect(states.at(-1)?.kind).toBe("playing");
  });
});
