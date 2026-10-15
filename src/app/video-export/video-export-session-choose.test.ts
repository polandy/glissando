import { describe, expect, it } from "vitest";
import { VideoExportSession } from "./video-export-session";
import { FakeExportPorts } from "./testing/fake-export-ports";
import { kindOf, opened, session } from "./video-export-session-fixtures";

describe("VideoExportSession — choose", () => {
  it("probes while opening, then offers the available presets with the default one chosen", async () => {
    const ports = new FakeExportPorts();
    ports.capabilities = {
      supported: true,
      available: ["720p", "1080p"],
      defaultPreset: "1080p",
      audioCodec: "opus",
    };
    const sheet = session(ports);
    expect(sheet.state.kind).toBe("probing");

    await sheet.open();

    expect(sheet.state).toMatchObject({
      kind: "choose",
      available: ["720p", "1080p"],
      preset: "1080p",
      audioCodec: "opus",
      starting: false,
    });
  });

  it("shows why when the browser cannot export at all", async () => {
    const ports = new FakeExportPorts();
    ports.capabilities = { supported: false, reason: "no-video-encoder" };

    const sheet = await opened(ports);

    expect(sheet.state).toEqual({ kind: "unsupported", reason: "no-video-encoder" });
  });

  it("shows a probe that fails as failed and logs it", async () => {
    const ports = new FakeExportPorts();
    const broken = new Error("isConfigSupported threw");
    ports.probe = () => Promise.reject(broken);

    const sheet = await opened(ports);

    expect(sheet.state).toEqual({ kind: "failed", error: broken });
    expect(ports.logged).toEqual([broken]);
  });

  it("chooses an available preset and ignores one this device cannot encode", async () => {
    const ports = new FakeExportPorts();
    ports.capabilities = {
      supported: true,
      available: ["720p", "1080p"],
      defaultPreset: "1080p",
      audioCodec: null,
    };
    const sheet = await opened(ports, false);

    sheet.select("720p");
    expect(sheet.state).toMatchObject({ preset: "720p" });
    sheet.select("4k");
    expect(sheet.state).toMatchObject({ preset: "720p" });
  });

  it("tells every subscriber the current state at once and each change after", async () => {
    const sheet = session(new FakeExportPorts());
    const seen: string[] = [];
    sheet.subscribe((state) => seen.push(kindOf(state)));

    await sheet.open();

    expect(seen).toEqual(["probing", "choose"]);
  });
});

describe("VideoExportSession — clips", () => {
  it("names a clip this browser cannot decode before offering any preset", async () => {
    const ports = new FakeExportPorts();
    ports.undecodable = 2;

    const sheet = await opened(ports);

    expect(sheet.state).toEqual({ kind: "clip-unsupported", clip: 2 });
  });

  it("estimates the file with an audio track when a clip has sound, though there is no music", async () => {
    const ports = new FakeExportPorts();
    const withSound = new VideoExportSession(
      { title: "T", durationMs: 10_000, withMusic: false, withAudio: true },
      ports,
    );
    const silent = new VideoExportSession(
      { title: "T", durationMs: 10_000, withMusic: false, withAudio: false },
      ports,
    );

    expect(withSound.estimate("720p")).toBeGreaterThan(silent.estimate("720p"));
  });
});
