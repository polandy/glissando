import { describe, expect, it } from "vitest";
import { estimatePageBytes } from "../../html-export/plan";
import { estimatedBytes, presetById } from "../../video-export";
import { HtmlExportSession } from "./html-export-session";
import { FakeHtmlExportPorts, fakeDestination } from "./testing/fake-html-export-ports";

const TITLE = "Sommer am See";
const FILE_NAME = "Sommer am See.html";
const DURATION_MS = 10_000;
const PICTURES = 3;

function session(ports: FakeHtmlExportPorts, withMusic = true): HtmlExportSession {
  return new HtmlExportSession(
    { title: TITLE, durationMs: DURATION_MS, withMusic, pictureCount: PICTURES },
    ports,
  );
}

async function opened(ports = new FakeHtmlExportPorts()) {
  const sheet = session(ports);
  await sheet.open();
  return sheet;
}

/** Starts the export and waits until it runs; `ended` settles once its outcome is shown. */
async function running(ports: FakeHtmlExportPorts, sheet: HtmlExportSession) {
  const ended = sheet.start();
  const run = await ports.nextRun();
  return { ended, run };
}

describe("HtmlExportSession — choose", () => {
  it("offers Small first and estimates each size once the stored sizes are read", async () => {
    const ports = new FakeHtmlExportPorts();
    const sheet = session(ports);
    expect(sheet.state).toEqual({
      kind: "choose",
      sizeId: "small",
      estimates: null,
      starting: false,
    });

    await sheet.open();

    const weights = ports.weightsResult;
    expect(sheet.state).toEqual({
      kind: "choose",
      sizeId: "small",
      estimates: {
        small: estimatePageBytes(weights, "small"),
        sharp: estimatePageBytes(weights, "sharp"),
        "4k": estimatePageBytes(weights, "4k"),
      },
      starting: false,
    });
  });

  it("shows a failure when the stored sizes cannot be read, and logs it", async () => {
    const ports = new FakeHtmlExportPorts();
    const error = new Error("player not cached");
    ports.weightsError = error;

    const sheet = await opened(ports);

    expect(sheet.state).toEqual({ kind: "failed", error });
    expect(ports.logged).toEqual([error]);
  });

  it("selects another size and keeps the estimates", async () => {
    const sheet = await opened();
    const estimates = sheet.state.kind === "choose" ? sheet.state.estimates : null;

    sheet.select("4k");

    expect(sheet.state).toEqual({ kind: "choose", sizeId: "4k", estimates, starting: false });
  });

  it("compares the page with the 1080p video's estimate", () => {
    const sheet = session(new FakeHtmlExportPorts(), false);

    expect(sheet.videoBytes).toBe(estimatedBytes(presetById("1080p"), DURATION_MS, false));
  });
});

describe("HtmlExportSession — run", () => {
  it("builds the page in memory without a save picker and reports each picture", async () => {
    const ports = new FakeHtmlExportPorts();
    const sheet = await opened(ports);
    sheet.select("sharp");

    const { run } = await running(ports, sheet);
    run.onProgress({ picturesDone: 2, pictureCount: PICTURES, bytesWritten: 1234 });

    expect(ports.memoryDestinations.map((destination) => destination.fileName)).toEqual([
      FILE_NAME,
    ]);
    expect(run.sizeId).toBe("sharp");
    expect(run.sink).toBe(ports.memoryDestinations[0]?.sink);
    expect(sheet.state).toEqual({
      kind: "running",
      sizeId: "sharp",
      picturesDone: 2,
      pictureCount: PICTURES,
      bytesWritten: 1234,
    });
  });

  it("hands a page built in memory to a download where the browser cannot share it", async () => {
    const ports = new FakeHtmlExportPorts();
    const sheet = await opened(ports);
    const { ended } = await running(ports, sheet);

    await ports.finishRun("<!doctype html><title>x</title>");
    await ended;

    expect(sheet.state).toMatchObject({ kind: "done", sizeId: "small", delivery: "download" });
    const file = sheet.state.kind === "done" ? sheet.state.file : null;
    expect(file?.name).toBe(FILE_NAME);
    expect(await file?.text()).toBe("<!doctype html><title>x</title>");
  });

  it("offers the share sheet where the browser can share the page", async () => {
    const ports = new FakeHtmlExportPorts();
    ports.sharable = true;
    const sheet = await opened(ports);
    const { ended } = await running(ports, sheet);

    await ports.finishRun();
    await ended;

    expect(sheet.state).toMatchObject({ kind: "done", delivery: "share" });
  });

  it("streams into the picked file and shows it as saved", async () => {
    const ports = new FakeHtmlExportPorts();
    ports.pickerAvailable = true;
    ports.picked = fakeDestination("picked", "Mein See.html");
    const sheet = await opened(ports);

    const { ended, run } = await running(ports, sheet);
    await ports.finishRun();
    await ended;

    expect(ports.pickedNames).toEqual([FILE_NAME]);
    expect(run.sink).toBe(ports.picked.sink);
    expect(ports.memoryDestinations).toEqual([]);
    expect(sheet.state).toMatchObject({ kind: "done", delivery: "saved" });
    expect(sheet.state.kind === "done" && sheet.state.file.name).toBe("Mein See.html");
  });

  it("returns to choose when the save picker is dismissed", async () => {
    const ports = new FakeHtmlExportPorts();
    ports.pickerAvailable = true;
    const sheet = await opened(ports);
    sheet.select("4k");

    await sheet.start();

    expect(sheet.state).toMatchObject({ kind: "choose", sizeId: "4k", starting: false });
    expect(ports.runs).toEqual([]);
  });

  it("shows a failed run with its error and logs it", async () => {
    const ports = new FakeHtmlExportPorts();
    const sheet = await opened(ports);
    const { ended } = await running(ports, sheet);
    const error = new Error("picture 2 could not be read");

    await ports.failRun(error);
    await ended;

    expect(sheet.state).toEqual({ kind: "failed", error });
    expect(ports.logged).toEqual([error]);
  });
});

describe("HtmlExportSession — cancel", () => {
  it("aborts the running export when the sheet closes", async () => {
    const ports = new FakeHtmlExportPorts();
    const sheet = await opened(ports);
    const { ended, run } = await running(ports, sheet);
    expect(run.signal.aborted).toBe(false);

    sheet.close();

    expect(run.signal.aborted).toBe(true);
    await ports.failRun(run.signal.reason);
    await ended;
    expect(sheet.state.kind).toBe("running");
    expect(ports.logged).toEqual([]);
  });

  it("never starts an export once the sheet closed while the picker was open", async () => {
    const ports = new FakeHtmlExportPorts();
    ports.pickerAvailable = true;
    ports.picked = fakeDestination("picked", FILE_NAME);
    const sheet = await opened(ports);

    const started = sheet.start();
    sheet.close();
    await started;

    expect(ports.pickedNames).toEqual([FILE_NAME]);
    expect(ports.runs).toEqual([]);
  });
});

describe("HtmlExportSession — done", () => {
  async function done(ports: FakeHtmlExportPorts) {
    const sheet = await opened(ports);
    const { ended } = await running(ports, sheet);
    await ports.finishRun();
    await ended;
    return sheet;
  }

  it("downloads the page", async () => {
    const ports = new FakeHtmlExportPorts();
    const sheet = await done(ports);

    await sheet.deliver();

    expect(ports.downloaded.map((file) => file.name)).toEqual([FILE_NAME]);
  });

  it("shares the page; a dismissed share sheet is no error", async () => {
    const ports = new FakeHtmlExportPorts();
    ports.sharable = true;
    ports.shareError = new DOMException("dismissed", "AbortError");
    const sheet = await done(ports);

    await sheet.deliver();

    expect(ports.shared.map((file) => file.name)).toEqual([FILE_NAME]);
    expect(ports.logged).toEqual([]);
  });

  it("logs a share that failed for another reason", async () => {
    const ports = new FakeHtmlExportPorts();
    ports.sharable = true;
    const error = new DOMException("not allowed", "NotAllowedError");
    ports.shareError = error;
    const sheet = await done(ports);

    await sheet.deliver();

    expect(ports.logged).toEqual([error]);
  });

  it("opens the finished page, and releases its URL when the sheet closes", async () => {
    const ports = new FakeHtmlExportPorts();
    const sheet = await done(ports);

    sheet.openPage();
    expect(ports.opened.map((file) => file.name)).toEqual([FILE_NAME]);
    expect(ports.released).toBe(0);

    sheet.close();
    expect(ports.released).toBe(1);
  });
});
