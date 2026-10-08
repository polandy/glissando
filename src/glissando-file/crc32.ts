/** The reflected CRC-32 polynomial ZIP uses (IEEE 802.3). */
const POLYNOMIAL = 0xedb88320;
const BYTE_VALUES = 256;
const BITS_PER_BYTE = 8;
const ALL_ONES = 0xffffffff;
/** Bounds the memory a checksum over a large blob holds at once. */
const BLOB_CHUNK_BYTES = 8 * 1024 * 1024;

const TABLE = (() => {
  const table = new Uint32Array(BYTE_VALUES);
  for (let value = 0; value < BYTE_VALUES; value++) {
    let crc = value;
    for (let bit = 0; bit < BITS_PER_BYTE; bit++) {
      crc = crc & 1 ? (crc >>> 1) ^ POLYNOMIAL : crc >>> 1;
    }
    table[value] = crc >>> 0;
  }
  return table;
})();

/** The ZIP checksum of `bytes`; pass the checksum of the bytes before them to continue it. */
export function crc32(bytes: Uint8Array, previous = 0): number {
  let crc = (previous ^ ALL_ONES) >>> 0;
  for (const byte of bytes) {
    crc = (TABLE[(crc ^ byte) & 0xff] as number) ^ (crc >>> BITS_PER_BYTE);
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
