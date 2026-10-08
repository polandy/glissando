import { GLISSANDO_FILE_EXTENSION } from "../../glissando-file/export-slideshow";

/** The part of the File and Directory Entries API a drop needs; a dropped item is one of them. */
export interface DroppedEntry {
  readonly isFile: boolean;
  readonly isDirectory: boolean;
  file?(resolve: (file: File) => void, reject?: (error: DOMException) => void): void;
  createReader?(): {
    readEntries(
      resolve: (entries: DroppedEntry[]) => void,
      reject?: (error: DOMException) => void,
    ): void;
  };
}

/**
 * The files of a drop, folders read recursively. The entries must be taken while the drop event
 * runs; the browser empties the transfer after it.
 */
export function droppedFiles(transfer: DataTransfer): Promise<File[]> {
  const entries = [...transfer.items]
    .map((item) => item.webkitGetAsEntry())
    .filter((entry): entry is FileSystemEntry => entry !== null);
  return entries.length === 0 ? Promise.resolve([...transfer.files]) : filesOfEntries(entries);
}

export async function filesOfEntries(entries: readonly DroppedEntry[]): Promise<File[]> {
  const files: File[] = [];
  for (const entry of entries) {
    if (entry.isFile && entry.file) {
      const read = entry.file.bind(entry);
      files.push(await new Promise<File>((resolve, reject) => read(resolve, reject)));
    } else if (entry.isDirectory && entry.createReader) {
      files.push(...(await filesOfEntries(await allChildren(entry.createReader()))));
    }
  }
  return files;
}

/** A directory reader returns its entries in pages until an empty one. */
async function allChildren(reader: ReturnType<NonNullable<DroppedEntry["createReader"]>>) {
  const children: DroppedEntry[] = [];
  for (;;) {
    const page = await new Promise<DroppedEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject),
    );
    if (page.length === 0) {
      return children;
    }
    children.push(...page);
  }
}

/** A lone .glissando file among picked or dropped files opens as a slideshow; null otherwise. */
export function singleGlissandoFile(files: readonly File[]): File | null {
  const [only] = files;
  return files.length === 1 && only?.name.toLowerCase().endsWith(GLISSANDO_FILE_EXTENSION)
    ? only
    : null;
}
