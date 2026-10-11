import { describe, expect, it } from "vitest";
import type { FakePreview } from "./testing/fake-export-ports";
import { FakeExportPorts, fakeTarget } from "./testing/fake-export-ports";
import { FRAMES, opened, running } from "./video-export-session-fixtures";

describe("VideoExportSession — running", () => {
  it("writes a private file named after the title and preset, and reports progress", async () => {
    const ports = new FakeExportPorts();
    const sheet = await opened(ports);
    const previews: FakePreview[] = [];
    sheet.onPreview = (preview) => previews.push(preview);

    const { run } = await running(ports, sheet);
    expect(sheet.state).toEqual({
      kind: "running",
      preset: "1080p",
      framesDone: 0,
      framesTotal: FRAMES,
      remainingMs: null,
    });
    run.onProgress({ framesDone: 120, framesTotal: FRAMES, remainingMs: 4_500 }, { frame: 119 });

    expect(ports.privateTargets.map((target) => target.fileName)).toEqual([
      "Sommer am See (1080p).mp4",
    ]);
    expect(run).toMatchObject({ preset: "1080p", audioCodec: "aac" });
    expect(sheet.state).toMatchObject({ framesDone: 120, remainingMs: 4_500 });
    expect(previews).toEqual([{ frame: 119 }]);
  });

  it("asks where to save first where the browser can, in the same call as the click", async () => {
    const ports = new FakeExportPorts();
    ports.pickerAvailable = true;
    ports.picked = fakeTarget("picked", "Urlaub.mp4");
    const sheet = await opened(ports);

    // No await before the picker: it needs the click's user gesture.
    void sheet.start();
    expect(ports.pickedNames).toEqual(["Sommer am See (1080p).mp4"]);
    const run = await ports.nextRun();

    expect(run.target).toBe(ports.picked);
    expect(ports.privateTargets).toEqual([]);
  });

  it("goes back to choose, nothing started, when the picker is dismissed", async () => {
    const ports = new FakeExportPorts();
    ports.pickerAvailable = true;
    ports.picked = null;
    const sheet = await opened(ports);

    await sheet.start();

    expect(sheet.state).toMatchObject({ kind: "choose", starting: false });
    expect(ports.runs).toEqual([]);
  });

  it("shows a target that cannot be created as failed and logs it", async () => {
    const ports = new FakeExportPorts();
    ports.pickerAvailable = true;
    const refused = new Error("not allowed");
    ports.pickerError = refused;
    const sheet = await opened(ports);

    await sheet.start();

    expect(sheet.state).toEqual({ kind: "failed", error: refused });
    expect(ports.logged).toEqual([refused]);
  });

  it("keeps the screen awake exactly while the export runs", async () => {
    const ports = new FakeExportPorts();
    const sheet = await opened(ports);

    const { ended } = await running(ports, sheet);
    expect(ports.awake).toBe(1);
    ports.finish({ kind: "done", frames: FRAMES, file: new File(["mp4"], "x.mp4") });
    await ended;

    expect(sheet.state.kind).toBe("done");
    expect(ports.awake).toBe(0);
  });
});
