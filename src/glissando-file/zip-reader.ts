import { crc32, crc32OfBlob } from "./crc32";
import {
  CENTRAL_HEADER_BYTES,
  CENTRAL_SIGNATURE,
  END_RECORD_BYTES,
  END_SIGNATURE,
  FLAG_ENCRYPTED,
  LOCAL_HEADER_BYTES,
  LOCAL_SIGNATURE,
  METHOD_DEFLATED,
  METHOD_STORED,
} from "./zip-records";

/**
 * Reads a ZIP as any tool may have packed it (ADR-0038): entries stored or deflated, in any
 * order. No ZIP64. Nothing of an entry is read until `readEntry` asks for it, and every entry is
 * checked against its declared size and checksum as it is read.
 */

const MAX_COMMENT_BYTES = 0xffff;

export interface ZipEntry {
  readonly name: string;
  /** Where the entry's packed bytes start in the container. */
  readonly dataOffset: number;
  readonly packedSize: number;
  /** The unpacked size the directory declares; unpacking stops beyond it. */
  readonly size: number;
  readonly crc32: number;
  readonly method: number;
  readonly encrypted: boolean;
}

export type EntryRead =
  | { readonly kind: "ok"; readonly data: Blob }
  | { readonly kind: "damaged"; readonly reason: string };

/** Whether the file starts with a ZIP local header. */
export async function startsLikeZip(file: Blob): Promise<boolean> {
  const header = await viewOf(file, 0, LOCAL_HEADER_BYTES);
  return header.byteLength === LOCAL_HEADER_BYTES && header.getUint32(0, true) === LOCAL_SIGNATURE;
}

/**
 * The container's entries from its central directory, each checked against its local header;
 * null for a directory this reader cannot trust: cut short, inconsistent or with a name twice.
 */
export async function readZipDirectory(file: Blob): Promise<ZipEntry[] | null> {
  const end = await findEndRecord(file);
  if (end === null) {
    return null;
  }
  const count = end.getUint16(10, true);
  const centralSize = end.getUint32(12, true);
  const centralOffset = end.getUint32(16, true);
  if (end.getUint16(8, true) !== count || centralOffset + centralSize > file.size) {
    return null;
  }
  const central = await viewOf(file, centralOffset, centralSize);
  const entries: ZipEntry[] = [];
  const names = new Set<string>();
  let at = 0;
  for (let index = 0; index < count; index++) {
    if (at + CENTRAL_HEADER_BYTES > central.byteLength) {
      return null;
    }
    const entry = await checkedEntry(file, central, at, centralOffset);
    if (entry === null || names.has(entry.name)) {
      return null;
    }
    names.add(entry.name);
    entries.push(entry);
    at += centralHeaderLength(central, at);
  }
  return entries;
}

export interface ReadEntryOptions {
  /** The blob's MIME type. */
  readonly type?: string;
  /** The entry was read and checked before: a stored one is not checksummed again. */
  readonly checkedBefore?: boolean;
}

/**
 * An entry's unpacked bytes, checked against its declared size and checksum. A stored entry
 * stays a slice of the file; a deflated one is unpacked, at most to its declared size.
 */
export async function readEntry(
  file: Blob,
  entry: ZipEntry,
  { type = "", checkedBefore = false }: ReadEntryOptions = {},
): Promise<EntryRead> {
  if (entry.encrypted) {
    return damaged(`"${entry.name}" is encrypted`);
  }
  const packed = file.slice(entry.dataOffset, entry.dataOffset + entry.packedSize, type);
  if (entry.method === METHOD_STORED) {
    return checkedBefore || (await crc32OfBlob(packed)) === entry.crc32
      ? { kind: "ok", data: packed }
      : damaged(`"${entry.name}" does not match its checksum`);
  }
  if (entry.method === METHOD_DEFLATED) {
    return inflate(packed, entry, type);
  }
  return damaged(
    `"${entry.name}" is packed with ZIP method ${entry.method}; ` +
      `only stored (${METHOD_STORED}) and deflated (${METHOD_DEFLATED}) entries open`,
  );
}

async function inflate(packed: Blob, entry: ZipEntry, type: string): Promise<EntryRead> {
  const reader = packed.stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let unpacked = 0;
  let checksum = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      unpacked += value.byteLength;
      if (unpacked > entry.size) {
        await reader.cancel();
        return damaged(`"${entry.name}" unpacks to more than its declared ${entry.size} bytes`);
      }
      checksum = crc32(value, checksum);
      chunks.push(value);
    }
  } catch (error) {
    // The decompression stream signals broken deflate data, and nothing else, as a TypeError.
    if (error instanceof TypeError) {
      return damaged(`"${entry.name}" does not unpack: its deflated bytes are broken`);
    }
    throw error;
  }
  if (unpacked !== entry.size) {
    return damaged(`"${entry.name}" unpacks to ${unpacked} bytes, not its declared ${entry.size}`);
  }
  if (checksum !== entry.crc32) {
    return damaged(`"${entry.name}" does not match its checksum`);
  }
  return { kind: "ok", data: new Blob(chunks, { type }) };
}

async function checkedEntry(
  file: Blob,
  central: DataView,
  at: number,
  centralOffset: number,
): Promise<ZipEntry | null> {
  const method = central.getUint16(at + 10, true);
  const packedSize = central.getUint32(at + 20, true);
  const size = central.getUint32(at + 24, true);
  const nameLength = central.getUint16(at + 28, true);
  const localOffset = central.getUint32(at + 42, true);
  if (
    central.getUint32(at, true) !== CENTRAL_SIGNATURE ||
    (method === METHOD_STORED && packedSize !== size) ||
    at + centralHeaderLength(central, at) > central.byteLength
  ) {
    return null;
  }
  const nameView = new DataView(
    central.buffer,
    central.byteOffset + at + CENTRAL_HEADER_BYTES,
    nameLength,
  );
  const name = decodeName(nameView);
  const local = await viewOf(file, localOffset, LOCAL_HEADER_BYTES);
  if (local.byteLength < LOCAL_HEADER_BYTES || local.getUint32(0, true) !== LOCAL_SIGNATURE) {
    return null;
  }
  const localNameLength = local.getUint16(26, true);
  const dataOffset = localOffset + LOCAL_HEADER_BYTES + localNameLength + local.getUint16(28, true);
  const localName = decodeName(
    await viewOf(file, localOffset + LOCAL_HEADER_BYTES, localNameLength),
  );
  if (localName !== name || dataOffset + packedSize > centralOffset) {
    return null;
  }
  return {
    name,
    dataOffset,
    packedSize,
    size,
    crc32: central.getUint32(at + 16, true),
    method,
    encrypted: (central.getUint16(at + 8, true) & FLAG_ENCRYPTED) !== 0,
  };
}

/** A central header with its name, extra field and comment. */
function centralHeaderLength(central: DataView, at: number): number {
  return (
    CENTRAL_HEADER_BYTES +
    central.getUint16(at + 28, true) +
    central.getUint16(at + 30, true) +
    central.getUint16(at + 32, true)
  );
}

/** The end record sits in the last 22 bytes plus at most a 64 KiB comment. */
async function findEndRecord(file: Blob): Promise<DataView | null> {
  const tailStart = Math.max(0, file.size - END_RECORD_BYTES - MAX_COMMENT_BYTES);
  const tail = await viewOf(file, tailStart, file.size - tailStart);
  for (let at = tail.byteLength - END_RECORD_BYTES; at >= 0; at--) {
    if (tail.getUint32(at, true) === END_SIGNATURE) {
      return new DataView(tail.buffer, tail.byteOffset + at, END_RECORD_BYTES);
    }
  }
  return null;
}

async function viewOf(file: Blob, start: number, length: number): Promise<DataView> {
  return new DataView(await file.slice(start, start + length).arrayBuffer());
}

function decodeName(view: DataView): string {
  return new TextDecoder().decode(view);
}

function damaged(reason: string): EntryRead {
  return { kind: "damaged", reason };
}
