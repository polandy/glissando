import { describe, expect, it } from "vitest";
import { estimatedBytes, presetById } from "../../video-export";
import { FakeExportPorts, fakeTarget, type FakePreview } from "./testing/fake-export-ports";
import type { ExportSheetState } from "./export-sheet-state";
import { VideoExportSession } from "./video-export-session";

const TITLE = "Sommer am See";
/** 10 s: 300 frames. */
const DURATION_MS = 10_000;
const FRAMES = 300;

function session(ports: FakeExportPorts, withMusic = true): VideoExportSession<FakePreview> {
  return new VideoExportSession(
    { title: TITLE, durationMs: DURATION_MS, withMusic, picturesFromImmich: false },
    ports,
  );
}

async function opened(ports = new FakeExportPorts(), withMusic = true) {
  const sheet = session(ports, withMusic);
  await sheet.open();
  return sheet;
}

/** Starts the export and waits until it runs; `ended` settles once its outcome is shown. */
async function running(ports: FakeExportPorts, sheet: VideoExportSession<FakePreview>) {
  const ended = sheet.start();
  const run = await ports.nextRun();
  return { ended, run };
}

function kindOf(state: ExportSheetState): string {
  return state.kind;
}

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
});

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
