import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { server } from "vitest/browser";
import {
  PRIVATE_EXPORT_FOLDER,
  PRIVATE_EXPORT_LOCK_PREFIX,
  pickSaveTarget,
  privateExportTarget,
  sweepPrivateExports,
  type ExportTarget,
  type PrivateExportStorage,
} from "./file-targets";

const PICKED_NAME = "picked-target.mp4";
const EARLIER_CONTENT = "the file the user chose to overwrite";
// Only a browser with the save picker picks a file (Chromium); the test stubs the picker itself.
const picksFiles = "showSaveFilePicker" in window;

/** A file in the origin private file system that stands in for the one the picker returns. */
async function pickedFile(content: string): Promise<FileSystemFileHandle> {
  const root = await navigator.storage.getDirectory();
  const handle = await root.getFileHandle(PICKED_NAME, { create: true });
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
  return handle;
}

describe("pickSaveTarget", () => {
  afterEach(async () => {
    Reflect.deleteProperty(window, "showSaveFilePicker");
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(PICKED_NAME).catch(() => undefined);
  });

  it.skipIf(!picksFiles)(
    "leaves a picked file as it was when its export is aborted and discarded",
    async () => {
      const handle = await pickedFile(EARLIER_CONTENT);
      Reflect.set(window, "showSaveFilePicker", () => Promise.resolve(handle));
      const target = await pickSaveTarget(PICKED_NAME);
      if (target === null) throw new Error("the stubbed picker returned no file");

      const writer = (await target.open()).getWriter();
      await writer.write(new TextEncoder().encode("half an export"));
      await writer.abort();
      await target.discard();

      expect(target.kind).toBe("picked");
      expect(await (await handle.getFile()).text()).toBe(EARLIER_CONTENT);
    },
  );
});

// WebKit under Playwright has no origin private file system.
const hasOpfs = server.browser !== "webkit";
const FILE_NAME = "Show 720p.mp4";
const BYTES = new Uint8Array([1, 2, 3, 4]);
const OTHER_BYTES = new Uint8Array([9, 8]);

let testNumber = 0;
let scratch: FileSystemDirectoryHandle;
let prefix: string;

function storage(locks: LockManager | null = navigator.locks): PrivateExportStorage {
  let runs = 0;
  return { root: () => Promise.resolve(scratch), locks, newId: () => `${prefix}${(runs += 1)}` };
}

async function write(target: ExportTarget, bytes: Uint8Array): Promise<void> {
  const writer = (await target.open()).getWriter();
  await writer.write(bytes);
  await writer.close();
}

async function readBytes(target: ExportTarget): Promise<number[]> {
  return [...new Uint8Array(await (await target.file()).arrayBuffer())];
}

async function exportsFolder(): Promise<FileSystemDirectoryHandle> {
  return scratch.getDirectoryHandle(PRIVATE_EXPORT_FOLDER, { create: true });
}

async function runNames(): Promise<string[]> {
  const names: string[] = [];
  for await (const name of (await exportsFolder()).keys()) {
    names.push(name);
  }
  return names;
}

function scratchName(): string {
  return `file-targets-test-${testNumber}`;
}

/** What a crashed tab leaves: a run folder with a file and no lock. */
async function leaveOrphan(name: string): Promise<void> {
  const run = await (await exportsFolder()).getDirectoryHandle(name, { create: true });
  const file = await run.getFileHandle(FILE_NAME, { create: true });
  const writable = await file.createWritable();
  await writable.write(BYTES);
  await writable.close();
}

describe.skipIf(!hasOpfs)("private export targets", () => {
  /** A fresh folder under the real OPFS root and run ids no other test shares. */
  beforeEach(async () => {
    testNumber += 1;
    prefix = `file-targets-${testNumber}-`;
    const root = await navigator.storage.getDirectory();
    scratch = await root.getDirectoryHandle(scratchName(), { create: true });
  });

  afterEach(async () => {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(scratchName(), { recursive: true });
  });

  it("a sweep leaves a finished private export readable with its bytes", async () => {
    const target = await privateExportTarget(storage(), FILE_NAME);
    await write(target, BYTES);

    await sweepPrivateExports(storage());

    expect(await readBytes(target)).toEqual([...BYTES]);
    await target.discard();
  });

  it("a sweep leaves a private export whose writer is still open", async () => {
    const target = await privateExportTarget(storage(), FILE_NAME);
    const writer = (await target.open()).getWriter();
    await writer.write(BYTES);

    await sweepPrivateExports(storage());
    expect(await runNames()).toEqual([`${prefix}1`]);
    await writer.close();

    expect(await readBytes(target)).toEqual([...BYTES]);
    await target.discard();
  });

  it("a sweep removes a run folder nobody holds a lock for", async () => {
    const live = await privateExportTarget(storage(), FILE_NAME);
    await leaveOrphan("orphan-run");
    expect(await runNames()).toContain("orphan-run");

    await sweepPrivateExports(storage());

    expect(await runNames()).toEqual([`${prefix}1`]);
    await live.discard();
  });

  it("discard removes the run's folder and frees its lock", async () => {
    const target = await privateExportTarget(storage(), FILE_NAME);
    const lockName = `${PRIVATE_EXPORT_LOCK_PREFIX}${prefix}1`;
    const heldBefore = await navigator.locks.request(
      lockName,
      { ifAvailable: true },
      (lock) => lock === null,
    );
    expect(heldBefore).toBe(true);
    expect(await runNames()).toEqual([`${prefix}1`]);

    await target.discard();

    expect(await runNames()).toEqual([]);
    const free = await navigator.locks.request(
      lockName,
      { ifAvailable: true },
      (lock) => lock !== null,
    );
    expect(free).toBe(true);
  });

  it("two private exports with the same file name keep their own bytes", async () => {
    const first = await privateExportTarget(storage(), FILE_NAME);
    const second = await privateExportTarget(
      { ...storage(), newId: () => `${prefix}other` },
      FILE_NAME,
    );
    await write(first, BYTES);
    await write(second, OTHER_BYTES);
    expect(await readBytes(first)).toEqual([...BYTES]);
    expect(await readBytes(second)).toEqual([...OTHER_BYTES]);

    await first.discard();

    expect(await readBytes(second)).toEqual([...OTHER_BYTES]);
    await second.discard();
  });

  it("without Web Locks a sweep removes nothing and a private export still writes", async () => {
    const target = await privateExportTarget(storage(null), FILE_NAME);
    await write(target, BYTES);
    await leaveOrphan("orphan-run");

    await sweepPrivateExports(storage(null));

    expect(await readBytes(target)).toEqual([...BYTES]);
    expect(await runNames()).toContain("orphan-run");
    await target.discard();
  });
});
