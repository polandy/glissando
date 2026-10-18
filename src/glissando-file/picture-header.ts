/**
 * A picture's pixel size read from its header, without decoding it (ADR-0038): bounding a
 * picture before it is decoded keeps a hostile file from spending gigabytes to decode one.
 */

export interface PictureSize {
  readonly width: number;
  readonly height: number;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG_HEADER_BYTES = 24;
const PNG_IHDR_NAME = [0x49, 0x48, 0x44, 0x52];

const JPEG_SOI_MARKER = 0xd8;
const JPEG_MARKER_PREFIX = 0xff;
/** Markers with no length-prefixed segment body: not skipped by a length read. */
const JPEG_STANDALONE_MARKERS = new Set([
  0x01, 0xd8, 0xd9, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7,
]);
const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);
/** However many markers a well-formed file could plausibly hold before its SOFn. */
const JPEG_MAX_SEGMENTS = 512;
const JPEG_SOF_HEADER_BYTES = 9;

const RIFF_HEADER_BYTES = 12;
const WEBP_CHUNK_HEADER_BYTES = 8;
const WEBP_VP8X_PAYLOAD_BYTES = 10;
const WEBP_VP8L_PAYLOAD_BYTES = 5;
const WEBP_VP8_PAYLOAD_BYTES = 10;
const WEBP_VP8L_SIGNATURE = 0x2f;
const WEBP_VP8L_DIMENSION_BITS = 14;
const WEBP_VP8L_DIMENSION_MASK = (1 << WEBP_VP8L_DIMENSION_BITS) - 1;
const WEBP_VP8_DIMENSION_MASK = 0x3fff;

/** Reads a picture's width and height from its header; null when the format is not recognised. */
export async function readPictureHeader(picture: Blob): Promise<PictureSize | null> {
  const start = new Uint8Array(await picture.slice(0, RIFF_HEADER_BYTES).arrayBuffer());
  if (startsWith(start, PNG_SIGNATURE)) {
    return readPngHeader(picture);
  }
  if (start[0] === JPEG_MARKER_PREFIX && start[1] === JPEG_SOI_MARKER) {
    return readJpegHeader(picture);
  }
  if (isRiffWebp(start)) {
    return readWebpHeader(picture);
  }
  return null;
}

function startsWith(bytes: Uint8Array, prefix: readonly number[]): boolean {
  return prefix.length <= bytes.length && prefix.every((value, index) => bytes[index] === value);
}

function isRiffWebp(start: Uint8Array): boolean {
  const riff = "RIFF".split("").map((char) => char.charCodeAt(0));
  const webp = "WEBP".split("").map((char) => char.charCodeAt(0));
  return startsWith(start, riff) && webp.every((value, index) => start[8 + index] === value);
}

async function readPngHeader(picture: Blob): Promise<PictureSize | null> {
  const bytes = new Uint8Array(await picture.slice(0, PNG_HEADER_BYTES).arrayBuffer());
  if (
    bytes.length < PNG_HEADER_BYTES ||
    !PNG_IHDR_NAME.every((value, index) => bytes[12 + index] === value)
  ) {
    return null;
  }
  const view = new DataView(bytes.buffer);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

async function readJpegHeader(picture: Blob): Promise<PictureSize | null> {
  let at = 2;
  for (let segment = 0; segment < JPEG_MAX_SEGMENTS; segment++) {
    const marker = new Uint8Array(await picture.slice(at, at + 2).arrayBuffer());
    if (marker.length < 2 || marker[0] !== JPEG_MARKER_PREFIX) {
      return null;
    }
    const code = marker[1] as number;
    if (JPEG_SOF_MARKERS.has(code)) {
      const body = new Uint8Array(
        await picture.slice(at + 2, at + 2 + JPEG_SOF_HEADER_BYTES).arrayBuffer(),
      );
      if (body.length < JPEG_SOF_HEADER_BYTES) {
        return null;
      }
      const view = new DataView(body.buffer);
      return { height: view.getUint16(3), width: view.getUint16(5) };
    }
    if (code === JPEG_SOI_MARKER || JPEG_STANDALONE_MARKERS.has(code)) {
      at += 2;
      continue;
    }
    const length = new Uint8Array(await picture.slice(at + 2, at + 4).arrayBuffer());
    if (length.length < 2) {
      return null;
    }
    const segmentLength = new DataView(length.buffer).getUint16(0);
    at += 2 + segmentLength;
  }
  return null;
}

async function readWebpHeader(picture: Blob): Promise<PictureSize | null> {
  const header = new Uint8Array(
    await picture
      .slice(RIFF_HEADER_BYTES, RIFF_HEADER_BYTES + WEBP_CHUNK_HEADER_BYTES)
      .arrayBuffer(),
  );
  if (header.length < WEBP_CHUNK_HEADER_BYTES) {
    return null;
  }
  const chunkType = String.fromCharCode(...header.slice(0, 4));
  const payloadStart = RIFF_HEADER_BYTES + WEBP_CHUNK_HEADER_BYTES;
  if (chunkType === "VP8 ") {
    return readVp8Payload(picture, payloadStart);
  }
  if (chunkType === "VP8L") {
    return readVp8lPayload(picture, payloadStart);
  }
  if (chunkType === "VP8X") {
    return readVp8xPayload(picture, payloadStart);
  }
  return null;
}

async function readVp8Payload(picture: Blob, at: number): Promise<PictureSize | null> {
  const bytes = new Uint8Array(await picture.slice(at, at + WEBP_VP8_PAYLOAD_BYTES).arrayBuffer());
  if (bytes.length < WEBP_VP8_PAYLOAD_BYTES) {
    return null;
  }
  const view = new DataView(bytes.buffer);
  return {
    width: view.getUint16(6, true) & WEBP_VP8_DIMENSION_MASK,
    height: view.getUint16(8, true) & WEBP_VP8_DIMENSION_MASK,
  };
}

async function readVp8lPayload(picture: Blob, at: number): Promise<PictureSize | null> {
  const bytes = new Uint8Array(await picture.slice(at, at + WEBP_VP8L_PAYLOAD_BYTES).arrayBuffer());
  if (bytes.length < WEBP_VP8L_PAYLOAD_BYTES || bytes[0] !== WEBP_VP8L_SIGNATURE) {
    return null;
  }
  const view = new DataView(bytes.buffer);
  const bits = view.getUint32(1, true);
  return {
    width: (bits & WEBP_VP8L_DIMENSION_MASK) + 1,
    height: ((bits >>> WEBP_VP8L_DIMENSION_BITS) & WEBP_VP8L_DIMENSION_MASK) + 1,
  };
}

async function readVp8xPayload(picture: Blob, at: number): Promise<PictureSize | null> {
  const bytes = new Uint8Array(await picture.slice(at, at + WEBP_VP8X_PAYLOAD_BYTES).arrayBuffer());
  if (bytes.length < WEBP_VP8X_PAYLOAD_BYTES) {
    return null;
  }
  const view = new DataView(bytes.buffer);
  return {
    width: (view.getUint32(4, true) & 0xffffff) + 1,
    height: ((view.getUint32(6, true) >>> 8) & 0xffffff) + 1,
  };
}
