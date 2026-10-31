import { describe, expect, it } from "vitest";
import { estimatedBytes, presetById } from "../../video-export";
import { FakeExportPorts, fakeTarget } from "./testing/fake-export-ports";
import { DURATION_MS, FRAMES, opened, running } from "./video-export-session-fixtures";

describe("VideoExportSession — outcomes", () => {
  const file = new File(["mp4"], "Sommer am See (1080p).mp4");

  it("says a picked file is saved", async () => {
    const ports = new FakeExportPorts();
    ports.pickerAvailable = true;
    ports.picked = fakeTarget("picked", "Urlaub.mp4");
    ports.sharable = true;
    const sheet = await opened(ports);
    const { ended } = await running(ports, sheet);

    ports.finish({ kind: "done", frames: FRAMES, file });
    await ended;

    expect(sheet.state).toEqual({ kind: "done", preset: "1080p", file, delivery: "saved" });
  });

  it("offers the share sheet for a private file where the browser can share it", async () => {
    const ports = new FakeExportPorts();
    ports.sharable = true;
    const sheet = await opened(ports);
    const { ended } = await running(ports, sheet);
    ports.finish({ kind: "done", frames: FRAMES, file });
    await ended;
    expect(sheet.state).toMatchObject({ delivery: "share" });

    await sheet.deliver();

    expect(ports.shared).toEqual([file]);
    expect(ports.downloaded).toEqual([]);
  });

  it("offers a download for a private file where the browser cannot share it", async () => {
    const ports = new FakeExportPorts();
    const sheet = await opened(ports);
    const { ended } = await running(ports, sheet);
    ports.finish({ kind: "done", frames: FRAMES, file });
    await ended;
    expect(sheet.state).toMatchObject({ delivery: "download" });

    await sheet.deliver();

    expect(ports.downloaded).toEqual([file]);
    expect(ports.shared).toEqual([]);
  });

  it("treats a dismissed share sheet as no error but logs any other share failure", async () => {
    const ports = new FakeExportPorts();
    ports.sharable = true;
    const sheet = await opened(ports);
    const { ended } = await running(ports, sheet);
    ports.finish({ kind: "done", frames: FRAMES, file });
    await ended;

    ports.shareError = new DOMException("dismissed", "AbortError");
    await sheet.deliver();
    const broken = new Error("share failed");
    ports.shareError = broken;
    await sheet.deliver();

    expect(ports.shared).toHaveLength(2);
    expect(ports.logged).toEqual([broken]);
  });

  it("says at which frame the storage ran out and about how much is missing", async () => {
    const ports = new FakeExportPorts();
    const sheet = await opened(ports);
    const { ended } = await running(ports, sheet);

    ports.finish({ kind: "storage-full", frameReached: 120 });
    await ended;

    const estimate = estimatedBytes(presetById("1080p"), DURATION_MS, true);
    expect(sheet.state).toEqual({
      kind: "storage-full",
      preset: "1080p",
      frameReached: 120,
      framesTotal: FRAMES,
      missingBytes: estimate * (1 - 120 / FRAMES),
    });
  });

  it("goes back to choose with the small preset after the storage ran out", async () => {
    const ports = new FakeExportPorts();
    const sheet = await opened(ports);
    const { ended } = await running(ports, sheet);
    ports.finish({ kind: "storage-full", frameReached: 120 });
    await ended;

    sheet.backToChoose();

    expect(sheet.state).toMatchObject({ kind: "choose", preset: "720p", starting: false });
  });

  it("shows a failed export with its error and logs it", async () => {
    const ports = new FakeExportPorts();
    const sheet = await opened(ports);
    const { ended } = await running(ports, sheet);
    const error = new Error("encoder broke");

    ports.finish({ kind: "failed", error });
    await ended;

    expect(sheet.state).toEqual({ kind: "failed", error });
    expect(ports.logged).toEqual([error]);
  });
  it("discards the private file when the export throws instead of ending", async () => {
    const ports = new FakeExportPorts();
    const sheet = await opened(ports);
    const broken = new Error("music unreadable");
    ports.run = () => Promise.reject(broken);

    await sheet.start();

    expect(sheet.state).toEqual({ kind: "failed", error: broken });
    expect(ports.privateTargets[0]?.discarded).toBe(1);
  });

  it("retries a failed export back to choose with the preset kept", async () => {
    const ports = new FakeExportPorts();
    const sheet = await opened(ports);
    sheet.select("720p");
    const { ended } = await running(ports, sheet);
    ports.finish({ kind: "failed", error: new Error("encoder broke") });
    await ended;

    await sheet.retry();

    expect(sheet.state).toMatchObject({ kind: "choose", preset: "720p", starting: false });
  });

  it("probes again on retry when a clip could not be decoded", async () => {
    const ports = new FakeExportPorts();
    ports.undecodable = 2;
    const sheet = await opened(ports);
    expect(sheet.state).toEqual({ kind: "clip-unsupported", clip: 2 });
    ports.undecodable = null;

    await sheet.retry();

    expect(sheet.state.kind).toBe("choose");
  });

  it("does not retry outside a failure", async () => {
    const sheet = await opened();
    const before = sheet.state;

    await sheet.retry();

    expect(sheet.state).toBe(before);
  });
});
