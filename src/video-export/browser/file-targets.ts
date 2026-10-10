import type { FileSink } from "../ports";

/** The folder in the origin private file system that holds exports until the sheet closes. */
export const PRIVATE_EXPORT_FOLDER = "video-export";

/** What the save picker offers to save as. */
export interface SaveFileType {
  readonly description: string;
  readonly mimeType: string;
  readonly extension: string;
}

export const MP4_FILE_TYPE: SaveFileType = {
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

/** A file in the origin private file system under `video-export/`. */
export async function privateExportTarget(fileName: string): Promise<ExportTarget> {
  const folder = await exportFolder();
  const handle = await folder.getFileHandle(fileName, { create: true });
  return {
    kind: "private",
    fileName,
    open: () => handle.createWritable(),
    file: () => handle.getFile(),
    discard: () => folder.removeEntry(fileName),
  };
}

/** Empties `video-export/`; run at app start, it removes what a crash left behind. */
export async function sweepPrivateExports(): Promise<void> {
  const root = await navigator.storage.getDirectory();
  await root.removeEntry(PRIVATE_EXPORT_FOLDER, { recursive: true }).catch((error: unknown) => {
    if (!(error instanceof DOMException && error.name === "NotFoundError")) {
      throw error;
    }
  });
}

async function exportFolder(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(PRIVATE_EXPORT_FOLDER, { create: true });
}
