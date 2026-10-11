import { describe, expect, it } from "vitest";
import { FakeExportPorts, fakeTarget } from "./testing/fake-export-ports";
import { FRAMES, opened, running } from "./video-export-session-fixtures";

describe("VideoExportSession — closing", () => {
  it("cancels a running export at once by aborting its signal", async () => {
    const ports = new FakeExportPorts();
    const sheet = await opened(ports);
    const { run } = await running(ports, sheet);
    expect(run.signal.aborted).toBe(false);

    sheet.close();

    expect(run.signal.aborted).toBe(true);
    expect(ports.awake).toBe(0);
  });

  it("discards the private file of a finished export when the sheet closes", async () => {
    const ports = new FakeExportPorts();
    const sheet = await opened(ports);
    const { ended } = await running(ports, sheet);
    ports.finish({ kind: "done", frames: FRAMES, file: new File(["mp4"], "x.mp4") });
    await ended;
    const [target] = ports.privateTargets;
    expect(target?.discarded).toBe(0);

    sheet.close();

    expect(target?.discarded).toBe(1);
  });

  it("logs a private file that cannot be discarded, which the next app start sweeps", async () => {
    const ports = new FakeExportPorts();
    const sheet = await opened(ports);
    const { ended } = await running(ports, sheet);
    ports.finish({ kind: "done", frames: FRAMES, file: new File(["mp4"], "x.mp4") });
    await ended;
    const stuck = new DOMException("in use", "NoModificationAllowedError");
    const [target] = ports.privateTargets;
    if (target !== undefined) {
      target.discard = () => Promise.reject(stuck);
    }

    sheet.close();
    await Promise.resolve();
    await Promise.resolve();

    expect(ports.logged).toEqual([stuck]);
  });

  it("discards once however often the sheet is closed", async () => {
    const ports = new FakeExportPorts();
    const sheet = await opened(ports);
    const { ended } = await running(ports, sheet);
    ports.finish({ kind: "done", frames: FRAMES, file: new File(["mp4"], "x.mp4") });
    await ended;

    sheet.close();
    sheet.close();

    expect(ports.privateTargets[0]?.discarded).toBe(1);
  });

  it("keeps a file the user picked when the sheet closes", async () => {
    const ports = new FakeExportPorts();
    ports.pickerAvailable = true;
    const picked = fakeTarget("picked", "Urlaub.mp4");
    ports.picked = picked;
    const sheet = await opened(ports);
    const { ended } = await running(ports, sheet);
    ports.finish({ kind: "done", frames: FRAMES, file: new File(["mp4"], "Urlaub.mp4") });
    await ended;

    sheet.close();

    expect(sheet.state.kind).toBe("done");
    expect(picked.discarded).toBe(0);
  });

  it("discards a private file that finished just as the sheet closed", async () => {
    const ports = new FakeExportPorts();
    const sheet = await opened(ports);
    const { ended } = await running(ports, sheet);

    sheet.close();
    ports.finish({ kind: "done", frames: FRAMES, file: new File(["mp4"], "x.mp4") });
    await ended;

    expect(ports.privateTargets[0]?.discarded).toBe(1);
  });

  it("starts nothing once closed while the picker was open", async () => {
    const ports = new FakeExportPorts();
    ports.pickerAvailable = true;
    ports.picked = fakeTarget("picked", "Urlaub.mp4");
    const sheet = await opened(ports);

    const starting = sheet.start();
    sheet.close();
    await starting;

    expect(ports.pickedNames).toHaveLength(1);
    expect(ports.runs).toEqual([]);
  });
});
