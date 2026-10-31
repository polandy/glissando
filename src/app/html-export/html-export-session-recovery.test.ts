import { describe, expect, it } from "vitest";
import { opened, running, session } from "./html-export-session-fixtures";
import { FakeHtmlExportPorts } from "./testing/fake-html-export-ports";

/** Whole clips dwarf the pictures, so the three sizes come out within five percent. */
function clipHeavy(): FakeHtmlExportPorts {
  const ports = new FakeHtmlExportPorts();
  ports.weightsResult = { ...ports.weightsResult, videoBytes: 500_000_000 };
  return ports;
}

describe("HtmlExportSession — Standard preselect", () => {
  it("moves to Standard when clips make the sizes barely differ and nothing was chosen", async () => {
    const sheet = await opened(clipHeavy(), 1);

    expect(sheet.state).toMatchObject({ kind: "choose", sizeId: "sharp" });
  });

  it("keeps the size the user chose before the estimates arrived", async () => {
    const sheet = session(clipHeavy(), true, false, 1);
    sheet.select("small");

    await sheet.open();

    expect(sheet.state).toMatchObject({ kind: "choose", sizeId: "small" });
  });

  it("keeps the default when the estimates differ", async () => {
    const sheet = await opened(new FakeHtmlExportPorts(), 1);

    expect(sheet.state).toMatchObject({ kind: "choose", sizeId: "small" });
  });

  it("keeps the default without clips", async () => {
    const sheet = await opened(clipHeavy(), 0);

    expect(sheet.state).toMatchObject({ kind: "choose", sizeId: "small" });
  });
});

describe("HtmlExportSession — retry", () => {
  it("returns a failed run to choose with the size and the estimates kept", async () => {
    const ports = new FakeHtmlExportPorts();
    const sheet = await opened(ports);
    sheet.select("4k");
    const estimates = sheet.state.kind === "choose" ? sheet.state.estimates : null;
    const { ended } = await running(ports, sheet);
    await ports.failRun(new Error("picture 2 could not be read"));
    await ended;

    await sheet.retry();

    expect(sheet.state).toEqual({ kind: "choose", sizeId: "4k", estimates, starting: false });
  });

  it("reads the stored sizes again after they failed to read", async () => {
    const ports = new FakeHtmlExportPorts();
    ports.weightsError = new Error("storage unreadable");
    const sheet = await opened(ports);
    expect(sheet.state.kind).toBe("failed");
    ports.weightsError = null;

    await sheet.retry();

    expect(sheet.state).toMatchObject({ kind: "choose" });
    expect(sheet.state.kind === "choose" && sheet.state.estimates).not.toBeNull();
  });

  it("does nothing outside a failure", async () => {
    const sheet = await opened();
    const before = sheet.state;

    await sheet.retry();

    expect(sheet.state).toBe(before);
  });
});
