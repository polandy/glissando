import { crc32 } from "../crc32";

/**
 * Builds a ZIP byte by byte, for cases no real tool writes on purpose: a size or checksum that
 * lies, an unknown method, an encrypted flag. Real tools' output is in `./repacked/`.
 */

const METHOD_STORED = 0;
const METHOD_DEFLATED = 8;
const LOCAL_HEADER_BYTES = 30;
const CENTRAL_HEADER_BYTES = 46;
const END_RECORD_BYTES = 22;
const VERSION_NEEDED_FOR_DEFLATE = 20;
const LOCAL_SIGNATURE = 0x04034b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const END_SIGNATURE = 0x06054b50;

export interface RawEntry {
  readonly name: string;
  readonly content: string | Uint8Array;
  /** Deflated unless set; a number writes that method id with the content as it is. */
  readonly method?: "stored" | "deflated" | number;
  /** The unpacked size the headers declare; the content's own by default. */
  readonly declaredSize?: number;
  /** The checksum the headers declare; the content's own by default. */
  readonly crc32?: number;
  readonly flags?: number;
}

export async function rawZip(entries: readonly RawEntry[]): Promise<Blob> {
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = new TextEncoder().encode(entry.name);
    const content =
      typeof entry.content === "string" ? new TextEncoder().encode(entry.content) : entry.content;
    const method = methodId(entry.method);
    const packed =
      typeof entry.method !== "number" && method === METHOD_DEFLATED
        ? await deflateRaw(content)
        : content;
    const fields = {
      flags: entry.flags ?? 0,
      method,
      crc32: entry.crc32 ?? crc32(content),
      packedSize: packed.byteLength,
      size: entry.declaredSize ?? content.byteLength,
      nameLength: name.byteLength,
    };
    const local = header(LOCAL_HEADER_BYTES, LOCAL_SIGNATURE, fields, 0);
    central.push(header(CENTRAL_HEADER_BYTES, CENTRAL_SIGNATURE, fields, offset), name);
    parts.push(local, name, packed);
    offset += local.byteLength + name.byteLength + packed.byteLength;
  }
  const centralSize = central.reduce((sum, part) => sum + part.byteLength, 0);
  const end = new DataView(new ArrayBuffer(END_RECORD_BYTES));
  end.setUint32(0, END_SIGNATURE, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end] as BlobPart[]);
}

interface HeaderFields {
  readonly flags: number;
  readonly method: number;
  readonly crc32: number;
  readonly packedSize: number;
  readonly size: number;
  readonly nameLength: number;
}

/** Local and central headers share their fields, the central ones shifted by two bytes. */
function header(bytes: number, signature: number, fields: HeaderFields, localOffset: number) {
  const view = new DataView(new ArrayBuffer(bytes));
  const shift = bytes === CENTRAL_HEADER_BYTES ? 2 : 0;
  view.setUint32(0, signature, true);
  view.setUint16(4 + shift, VERSION_NEEDED_FOR_DEFLATE, true);
  view.setUint16(6 + shift, fields.flags, true);
  view.setUint16(8 + shift, fields.method, true);
  view.setUint32(14 + shift, fields.crc32, true);
  view.setUint32(18 + shift, fields.packedSize, true);
  view.setUint32(22 + shift, fields.size, true);
  view.setUint16(26 + shift, fields.nameLength, true);
  if (shift !== 0) {
    view.setUint32(42, localOffset, true);
  }
  return new Uint8Array(view.buffer);
}

function methodId(method: RawEntry["method"]): number {
  if (method === "stored") {
    return METHOD_STORED;
  }
  if (method === undefined || method === "deflated") {
    return METHOD_DEFLATED;
  }
  return method;
}

async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
