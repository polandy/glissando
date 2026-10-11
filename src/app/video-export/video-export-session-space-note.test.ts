import { describe, expect, it } from "vitest";
import { estimatedBytes, presetById } from "../../video-export";
import { FakeExportPorts } from "./testing/fake-export-ports";
import { DURATION_MS, opened } from "./video-export-session-fixtures";

describe("VideoExportSession — space note (private file only)", () => {
  const fourK = estimatedBytes(presetById("4k"), DURATION_MS, true);
  const fullHd = estimatedBytes(presetById("1080p"), DURATION_MS, true);

  it("warns when the free space is below the chosen preset's estimate and names the largest that fits", async () => {
    const ports = new FakeExportPorts();
    ports.free = fourK - 1;
    const sheet = await opened(ports);

    sheet.select("4k");

    expect(sheet.state).toMatchObject({
      spaceShortage: { freeBytes: fourK - 1, neededBytes: fourK, fitting: "1080p" },
    });
  });

  it("names no smaller preset when none fits either", async () => {
    const ports = new FakeExportPorts();
    ports.free = 1;
    const sheet = await opened(ports);

    expect(sheet.state).toMatchObject({ spaceShortage: { fitting: null } });
  });

  it("stays silent when the estimate fits", async () => {
    const ports = new FakeExportPorts();
    ports.free = fullHd;
    const sheet = await opened(ports);

    expect(sheet.state).toMatchObject({ kind: "choose", preset: "1080p", spaceShortage: null });
  });

  it("stays silent when the browser cannot tell the free space", async () => {
    const ports = new FakeExportPorts();
    ports.free = null;
    const sheet = await opened(ports);

    expect(sheet.state).toMatchObject({ kind: "choose", spaceShortage: null });
  });

  it("never warns when the user picks where to save, since that is not the browser's storage", async () => {
    const ports = new FakeExportPorts();
    ports.pickerAvailable = true;
    ports.free = 1;
    const sheet = await opened(ports);

    expect(sheet.state).toMatchObject({ kind: "choose", spaceShortage: null });
  });
});
