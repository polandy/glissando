import { crc32OfBlob } from "./crc32";

/**
 * A ZIP container whose entries are stored, never compressed: the minimal subset Glissando
 * writes and reads (see ADR-0004). No ZIP64, so the container stays under 4 GiB and 65,535
 * entries.
 */

const LOCAL_SIGNATURE = 0x04034b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const END_SIGNATURE = 0x06054b50;
const LOCAL_HEADER_BYTES = 30;
const CENTRAL_HEADER_BYTES = 46;
const END_RECORD_BYTES = 22;
const MAX_COMMENT_BYTES = 0xffff;
/** Sizes and offsets at or above this need ZIP64, which this container does not write. */
const MAX_32_BIT = 0xffffffff;
const MAX_ENTRIES = 0xffff;
/** Version 1.0: stored entries need no more. */
const VERSION_NEEDED = 10;
const FLAG_ENCRYPTED = 0x0001;
const FLAG_UTF8_NAMES = 0x0800;
const METHOD_STORED = 0;
const DOS_EPOCH_YEAR = 1980;

export interface ZipEntry {
  readonly name: string;
  /** Where the entry's bytes start in the container. */
  readonly dataOffset: number;
  readonly size: number;
  readonly crc32: number;
}

/** The container would need ZIP64: over 4 GiB or 65,535 entries. */
export class ZipTooLargeError extends Error {
  constructor(what: string) {
    super(`the .glissando container cannot hold ${what}: it is limited to 4 GiB and 65535 entries`);
    this.name = "ZipTooLargeError";
  }
}

interface WrittenEntry {
  readonly nameBytes: Uint8Array<ArrayBuffer>;
  readonly size: number;
  readonly crc32: number;
  readonly localOffset: number;
}

/** Builds the container from blob parts, so the entries' bytes are not copied once more. */
export class StoredZipWriter {
  readonly #parts: BlobPart[] = [];
  readonly #entries: WrittenEntry[] = [];
  readonly #time: number;
  readonly #date: number;
  #offset = 0;

  constructor(modifiedAt: Date) {
    [this.#time, this.#date] = dosDateTime(modifiedAt);
  }

  async add(name: string, data: Blob): Promise<void> {
    if (this.#entries.length >= MAX_ENTRIES) {
      throw new ZipTooLargeError(`more than ${MAX_ENTRIES} entries`);
    }
    const nameBytes = new Uint8Array(new TextEncoder().encode(name));
    const entry = {
      nameBytes,
      size: data.size,
      crc32: await crc32OfBlob(data),
      localOffset: this.#offset,
    };
    const header = this.#header(LOCAL_HEADER_BYTES, LOCAL_SIGNATURE, entry);
    this.#offset += header.byteLength + nameBytes.byteLength + data.size;
    if (this.#offset >= MAX_32_BIT) {
      throw new ZipTooLargeError(`"${name}" beyond 4 GiB`);
    }
    this.#parts.push(header, nameBytes, data);
    this.#entries.push(entry);
  }

  finish(): Blob {
    const centralOffset = this.#offset;
    const central: BlobPart[] = [];
    let centralSize = 0;
    for (const entry of this.#entries) {
      const header = this.#header(CENTRAL_HEADER_BYTES, CENTRAL_SIGNATURE, entry);
      central.push(header, entry.nameBytes);
      centralSize += header.byteLength + entry.nameBytes.byteLength;
    }
    if (centralOffset + centralSize >= MAX_32_BIT) {
      throw new ZipTooLargeError("its directory beyond 4 GiB");
    }
    const end = new DataView(new ArrayBuffer(END_RECORD_BYTES));
    end.setUint32(0, END_SIGNATURE, true);
    end.setUint16(8, this.#entries.length, true);
    end.setUint16(10, this.#entries.length, true);
    end.setUint32(12, centralSize, true);
    end.setUint32(16, centralOffset, true);
    return new Blob([...this.#parts, ...central, end.buffer]);
  }

  /** The fields local and central headers share sit at the same place after a 4-byte shift. */
  #header(bytes: number, signature: number, entry: WrittenEntry): ArrayBuffer {
    const view = new DataView(new ArrayBuffer(bytes));
    const central = signature === CENTRAL_SIGNATURE;
    const shift = central ? 2 : 0;
    view.setUint32(0, signature, true);
    if (central) {
      view.setUint16(4, VERSION_NEEDED, true);
    }
    view.setUint16(4 + shift, VERSION_NEEDED, true);
    view.setUint16(6 + shift, FLAG_UTF8_NAMES, true);
    view.setUint16(8 + shift, METHOD_STORED, true);
    view.setUint16(10 + shift, this.#time, true);
    view.setUint16(12 + shift, this.#date, true);
    view.setUint32(14 + shift, entry.crc32, true);
    view.setUint32(18 + shift, entry.size, true);
    view.setUint32(22 + shift, entry.size, true);
    view.setUint16(26 + shift, entry.nameBytes.byteLength, true);
    if (central) {
      view.setUint32(42, entry.localOffset, true);
    }
    return view.buffer;
  }
}

/** The name in the container's first local header; null when it does not start like a ZIP. */
export async function firstEntryName(file: Blob): Promise<string | null> {
  const header = await viewOf(file, 0, LOCAL_HEADER_BYTES);
  if (header.byteLength < LOCAL_HEADER_BYTES || header.getUint32(0, true) !== LOCAL_SIGNATURE) {
    return null;
  }
  const nameBytes = header.getUint16(26, true);
  return decodeName(await viewOf(file, LOCAL_HEADER_BYTES, nameBytes));
}

/**
 * The container's entries from its central directory, each checked against its local header;
 * null for anything this reader cannot trust: cut short, inconsistent, compressed or encrypted.
 * The entries' bytes are not read (see `entryData`).
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

/** An entry's bytes as a slice of the container: nothing is read until the blob is. */
export function entryData(file: Blob, entry: ZipEntry, type = ""): Blob {
  return file.slice(entry.dataOffset, entry.dataOffset + entry.size, type);
}

async function checkedEntry(
  file: Blob,
  central: DataView,
  at: number,
  centralOffset: number,
): Promise<ZipEntry | null> {
  const flags = central.getUint16(at + 8, true);
  const size = central.getUint32(at + 24, true);
  const nameLength = central.getUint16(at + 28, true);
  const localOffset = central.getUint32(at + 42, true);
  if (
    central.getUint32(at, true) !== CENTRAL_SIGNATURE ||
    (flags & FLAG_ENCRYPTED) !== 0 ||
    central.getUint16(at + 10, true) !== METHOD_STORED ||
    central.getUint32(at + 20, true) !== size ||
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
  if (localName !== name || dataOffset + size > centralOffset) {
    return null;
  }
  return { name, dataOffset, size, crc32: central.getUint32(at + 16, true) };
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

/** MS-DOS time and date, as ZIP stores them: two-second steps, years from 1980. */
function dosDateTime(instant: Date): [number, number] {
  const year = Math.max(instant.getUTCFullYear(), DOS_EPOCH_YEAR);
  const time =
    (instant.getUTCHours() << 11) | (instant.getUTCMinutes() << 5) | (instant.getUTCSeconds() >> 1);
  const date =
    ((year - DOS_EPOCH_YEAR) << 9) | ((instant.getUTCMonth() + 1) << 5) | instant.getUTCDate();
  return [time, date];
}
