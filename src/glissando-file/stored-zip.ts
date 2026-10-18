import { crc32OfBlob } from "./crc32";
import {
  CENTRAL_HEADER_BYTES,
  CENTRAL_SIGNATURE,
  END_RECORD_BYTES,
  END_SIGNATURE,
  FLAG_UTF8_NAMES,
  LOCAL_HEADER_BYTES,
  LOCAL_SIGNATURE,
  METHOD_STORED,
} from "./zip-records";

/**
 * Writes a ZIP container whose entries are stored, never compressed, the way Glissando exports
 * (see ADR-0004); `./zip-reader.ts` reads it and what other tools pack. No ZIP64, so the
 * container stays under 4 GiB and 65,535 entries.
 */

/** Sizes and offsets at or above this need ZIP64, which this container does not write. */
export const MAX_32_BIT = 0xffffffff;
const MAX_ENTRIES = 0xffff;
/** Version 1.0: stored entries need no more. */
const VERSION_NEEDED = 10;
const DOS_EPOCH_YEAR = 1980;

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

/** MS-DOS time and date, as ZIP stores them: two-second steps, years from 1980. */
function dosDateTime(instant: Date): [number, number] {
  const year = Math.max(instant.getUTCFullYear(), DOS_EPOCH_YEAR);
  const time =
    (instant.getUTCHours() << 11) | (instant.getUTCMinutes() << 5) | (instant.getUTCSeconds() >> 1);
  const date =
    ((year - DOS_EPOCH_YEAR) << 9) | ((instant.getUTCMonth() + 1) << 5) | instant.getUTCDate();
  return [time, date];
}
