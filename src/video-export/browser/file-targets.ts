import type { FileSink } from "../ports";

/** The folder in the origin private file system that holds exports until the sheet closes. */
export const PRIVATE_EXPORT_FOLDER = "video-export";

/** Web Lock name prefix; a run's lock is held while its export is in use. */
export const PRIVATE_EXPORT_LOCK_PREFIX = "glissando-video-export:";

/** What the save picker offers to save as. */
export interface SaveFileType {
  readonly description: string;
  readonly mimeType: string;
  readonly extension: string;
}

const MP4_FILE_TYPE: SaveFileType = {
  description: "MP4",
  mimeType: "video/mp4",
  extension: ".mp4",
};

/** Where an export writes: a file the user picked or one in the origin private file system. */
export interface ExportTarget extends FileSink {
  readonly kind: "picked" | "private";
  readonly fileName: string;
  /** Opens the file for writing from its start; one writer per export. */
  open(): Promise<WritableStream>;
  /** The written file, disk-backed. */
  file(): Promise<File>;
}

interface SaveFilePickerOptions {
  readonly suggestedName: string;
  readonly types: readonly {
    readonly description: string;
    readonly accept: Record<string, readonly string[]>;
  }[];
}
type ShowSaveFilePicker = (options: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;

function saveFilePicker(): ShowSaveFilePicker | null {
  const picker: unknown = Reflect.get(window, "showSaveFilePicker");
  return typeof picker === "function" ? (picker.bind(window) as ShowSaveFilePicker) : null;
}

/** Whether "Video erstellen" asks where to save (Chromium); elsewhere the file goes private first. */
export function canPickSaveFile(): boolean {
  return saveFilePicker() !== null;
}

/**
 * Asks where to save; call it in the click's user gesture. Null when the user dismissed the
 * picker. A cancelled or failed export leaves the file as it was before.
 */
export async function pickSaveTarget(
  suggestedName: string,
  fileType: SaveFileType = MP4_FILE_TYPE,
): Promise<ExportTarget | null> {
  const picker = saveFilePicker();
  if (picker === null) {
    throw new Error("this browser has no showSaveFilePicker; use privateExportTarget instead");
  }
  let handle: FileSystemFileHandle;
  try {
    handle = await picker({
      suggestedName,
      types: [
        {
          description: fileType.description,
          accept: { [fileType.mimeType]: [fileType.extension] },
        },
      ],
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return null;
    }
    throw error;
  }
  return {
    kind: "picked",
    fileName: handle.name,
    open: () => handle.createWritable(),
    file: () => handle.getFile(),
    // An aborted writer has already left the file as it was: File System Access writes into a
    // swap file that only `close()` commits. A browser cannot delete the file the picker created.
    discard: () => Promise.resolve(),
  };
}

/** What a private export needs from the browser; `locks` is null where Web Locks is missing. */
export interface PrivateExportStorage {
  readonly root: () => Promise<FileSystemDirectoryHandle>;
  readonly locks: LockManager | null;
  readonly newId: () => string;
}

function lockName(runId: string): string {
  return `${PRIVATE_EXPORT_LOCK_PREFIX}${runId}`;
}

/**
 * Holds the exclusive lock of one run until `release()`; resolves once it is granted. Other tabs
 * see a held lock as "this run is in use".
 */
async function holdRunLock(locks: LockManager, runId: string): Promise<{ release: () => void }> {
  let release: () => void = () => undefined;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  await new Promise<void>((granted, rejected) => {
    locks
      .request(lockName(runId), { mode: "exclusive" }, () => {
        granted();
        return released;
      })
      .catch(rejected);
  });
  return { release };
}

/**
 * A file in the origin private file system under `video-export/<run>/`. The run's lock is held
 * until `discard()`, and taken before the folder exists, so a sweep never finds a folder in use
 * without its lock.
 */
export async function privateExportTarget(
  storage: PrivateExportStorage,
  fileName: string,
): Promise<ExportTarget> {
  const runId = storage.newId();
  const lock = storage.locks === null ? null : await holdRunLock(storage.locks, runId);
  try {
    const root = await storage.root();
    const exports = await root.getDirectoryHandle(PRIVATE_EXPORT_FOLDER, { create: true });
    const runFolder = await exports.getDirectoryHandle(runId, { create: true });
    const handle = await runFolder.getFileHandle(fileName, { create: true });
    return {
      kind: "private",
      fileName,
      open: () => handle.createWritable(),
      file: () => handle.getFile(),
      discard: async () => {
        try {
          await exports.removeEntry(runId, { recursive: true });
        } finally {
          lock?.release();
        }
      },
    };
  } catch (error: unknown) {
    lock?.release();
    throw error;
  }
}

function isNotFound(error: unknown): boolean {
  return error instanceof DOMException && error.name === "NotFoundError";
}

/**
 * Removes the runs of `video-export/` no tab holds a lock for: what a crash left behind. A run
 * in use by this or another tab is left alone. Without Web Locks nothing can be told apart, so
 * nothing is removed.
 */
export async function sweepPrivateExports(
  storage: Pick<PrivateExportStorage, "root" | "locks">,
): Promise<void> {
  const { locks } = storage;
  if (locks === null) {
    return;
  }
  const root = await storage.root();
  let exports: FileSystemDirectoryHandle;
  try {
    exports = await root.getDirectoryHandle(PRIVATE_EXPORT_FOLDER);
  } catch (error: unknown) {
    if (isNotFound(error)) {
      return;
    }
    throw error;
  }
  const names: string[] = [];
  for await (const name of exports.keys()) {
    names.push(name);
  }
  for (const name of names) {
    await locks.request(lockName(name), { ifAvailable: true }, async (lock) => {
      if (lock === null) {
        return;
      }
      await exports.removeEntry(name, { recursive: true }).catch((error: unknown) => {
        if (!isNotFound(error)) {
          throw error;
        }
      });
    });
  }
}
