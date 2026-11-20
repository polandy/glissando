/** The reflected CRC-32 polynomial ZIP uses (IEEE 802.3). */
const POLYNOMIAL = 0xedb88320;
const BYTE_VALUES = 256;
const BITS_PER_BYTE = 8;
const ALL_ONES = 0xffffffff;
/** Bounds the memory a checksum over a large blob holds at once. */
const BLOB_CHUNK_BYTES = 8 * 1024 * 1024;

const SLICES = 8;
const BYTE_MASK = 0xff;

/** TABLES[k][b] is the checksum register after byte b followed by k zero bytes. */
const TABLES = (() => {
  const tables = new Uint32Array(SLICES * BYTE_VALUES);
  for (let value = 0; value < BYTE_VALUES; value++) {
    let crc = value;
    for (let bit = 0; bit < BITS_PER_BYTE; bit++) {
      crc = crc & 1 ? (crc >>> 1) ^ POLYNOMIAL : crc >>> 1;
    }
    tables[value] = crc >>> 0;
  }
  for (let value = 0; value < BYTE_VALUES; value++) {
    let crc = tables[value] as number;
    for (let slice = 1; slice < SLICES; slice++) {
      crc = ((tables[crc & BYTE_MASK] as number) ^ (crc >>> BITS_PER_BYTE)) >>> 0;
      tables[slice * BYTE_VALUES + value] = crc;
    }
  }
  return tables;
})();

/** The ZIP checksum of `bytes`; pass the checksum of the bytes before them to continue it. */
export function crc32(bytes: Uint8Array, previous = 0): number {
  const t = TABLES;
  let crc = (previous ^ ALL_ONES) >>> 0;
  let i = 0;
  const wholeSlicesEnd = bytes.length - (bytes.length % SLICES);
  for (; i < wholeSlicesEnd; i += SLICES) {
    const low =
      (crc ^
        ((bytes[i] as number) |
          ((bytes[i + 1] as number) << 8) |
          ((bytes[i + 2] as number) << 16) |
          ((bytes[i + 3] as number) << 24))) >>>
      0;
    crc =
      (t[7 * BYTE_VALUES + (low & BYTE_MASK)] as number) ^
      (t[6 * BYTE_VALUES + ((low >>> 8) & BYTE_MASK)] as number) ^
      (t[5 * BYTE_VALUES + ((low >>> 16) & BYTE_MASK)] as number) ^
      (t[4 * BYTE_VALUES + (low >>> 24)] as number) ^
      (t[3 * BYTE_VALUES + (bytes[i + 4] as number)] as number) ^
      (t[2 * BYTE_VALUES + (bytes[i + 5] as number)] as number) ^
      (t[BYTE_VALUES + (bytes[i + 6] as number)] as number) ^
      (t[bytes[i + 7] as number] as number);
  }
  for (; i < bytes.length; i++) {
    crc = (t[(crc ^ (bytes[i] as number)) & BYTE_MASK] as number) ^ (crc >>> BITS_PER_BYTE);
  }
  return (crc ^ ALL_ONES) >>> 0;
}

/** The ZIP checksum of a blob, read in slices so a large file never sits in memory whole. */
export async function crc32OfBlob(blob: Blob, chunkBytes = BLOB_CHUNK_BYTES): Promise<number> {
  let crc = 0;
  for (let start = 0; start < blob.size; start += chunkBytes) {
    const chunk = await blob.slice(start, start + chunkBytes).arrayBuffer();
    crc = crc32(new Uint8Array(chunk), crc);
  }
  return crc;
}
