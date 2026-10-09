import type { ExportTarget } from "../browser/file-targets";

interface PositionedWrite {
  readonly type: "write";
  readonly data: Uint8Array;
  readonly position: number;
}

/**
 * Keeps the export in memory, for engines whose test browser has no origin private file system
 * (WebKit under Playwright fails `navigator.storage.getDirectory()`).
 */
export function memoryExportTarget(fileName: string): ExportTarget {
  let bytes = new Uint8Array(0);
  const write = ({ data, position }: PositionedWrite) => {
    const end = position + data.byteLength;
    if (end > bytes.byteLength) {
      const grown = new Uint8Array(Math.max(end, bytes.byteLength * 2));
      grown.set(bytes);
      bytes = grown;
    }
    bytes.set(data, position);
    length = Math.max(length, end);
  };
  let length = 0;
  return {
    kind: "private",
    fileName,
    open: () => Promise.resolve(new WritableStream<PositionedWrite>({ write })),
    file: () =>
      Promise.resolve(new File([bytes.slice(0, length)], fileName, { type: "video/mp4" })),
    discard: () => {
      bytes = new Uint8Array(0);
      length = 0;
      return Promise.resolve();
    },
  };
}
