/** A picture's size as its header claims it, before any decode. */
export interface PictureDimensions {
  readonly width: number;
  readonly height: number;
}

const JPEG_SOI = [0xff, 0xd8];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const GIF_SIGNATURE = "GIF8";
const RIFF = "RIFF";
const PNG_HEADER_CHUNK = "IHDR";
const WEBP_LOSSY = "VP8 ";
const WEBP_LOSSLESS = "VP8L";
const WEBP_EXTENDED = "VP8X";
const CHUNK_NAME_BYTES = 4;
const WEBP = "WEBP";
const PNG_IHDR_OFFSET = 12;
const PNG_SIZE_OFFSET = 16;
const GIF_SIZE_OFFSET = 6;
const WEBP_FORM_OFFSET = 8;
const WEBP_CHUNK_OFFSET = 12;
const WEBP_LOSSY_SIZE_OFFSET = 26;
const WEBP_LOSSLESS_BITS_OFFSET = 21;
const WEBP_EXTENDED_SIZE_OFFSET = 24;
const FOURTEEN_BIT_MASK = 0x3fff;
const LOSSLESS_HEIGHT_SHIFT = 14;

const MARKER_PREFIX = 0xff;
const MARKER_BYTES = 2;
const SEGMENT_LENGTH_BYTES = 2;
const SOF_FIRST = 0xc0;
const SOF_LAST = 0xcf;
/** Markers inside the SOF range that are not frame headers: DHT, JPG and DAC. */
const NOT_A_FRAME = new Set([0xc4, 0xc8, 0xcc]);
/** Standalone markers without a segment: TEM, RSTn, SOI and EOI. */
const WITHOUT_SEGMENT = new Set([0x01, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9]);
const EOI = 0xd9;
const SOF_HEIGHT_OFFSET = 3;
const SOF_WIDTH_OFFSET = 5;

function startsWith(head: Uint8Array, prefix: readonly number[], at = 0): boolean {
  return prefix.every((value, index) => head[at + index] === value);
}

function asciiAt(head: Uint8Array, at: number, length: number): string {
  return String.fromCharCode(...head.subarray(at, at + length));
}

function view(head: Uint8Array): DataView {
  return new DataView(head.buffer, head.byteOffset, head.byteLength);
}

function ifFits(
  head: Uint8Array,
  end: number,
  read: (data: DataView) => PictureDimensions,
): PictureDimensions | null {
  return head.length >= end ? read(view(head)) : null;
}

function jpegSize(head: Uint8Array): PictureDimensions | null {
  const data = view(head);
  let at = JPEG_SOI.length;
  while (at + MARKER_BYTES + SEGMENT_LENGTH_BYTES <= head.length) {
    if (head[at] !== MARKER_PREFIX) return null;
    const marker = head[at + 1] as number;
    if (marker === EOI) return null;
    if (WITHOUT_SEGMENT.has(marker)) {
      at += MARKER_BYTES;
      continue;
    }
    const segment = at + MARKER_BYTES;
    if (marker >= SOF_FIRST && marker <= SOF_LAST && !NOT_A_FRAME.has(marker)) {
      const end = segment + SOF_WIDTH_OFFSET + 2;
      if (head.length < end) return null;
      return {
        width: data.getUint16(segment + SOF_WIDTH_OFFSET),
        height: data.getUint16(segment + SOF_HEIGHT_OFFSET),
      };
    }
    const length = data.getUint16(segment);
    if (length < SEGMENT_LENGTH_BYTES) return null;
    at = segment + length;
  }
  return null;
}

function pngSize(head: Uint8Array): PictureDimensions | null {
  if (asciiAt(head, PNG_IHDR_OFFSET, CHUNK_NAME_BYTES) !== PNG_HEADER_CHUNK) return null;
  return ifFits(head, PNG_SIZE_OFFSET + 8, (data) => ({
    width: data.getUint32(PNG_SIZE_OFFSET),
    height: data.getUint32(PNG_SIZE_OFFSET + 4),
  }));
}

function gifSize(head: Uint8Array): PictureDimensions | null {
  return ifFits(head, GIF_SIZE_OFFSET + 4, (data) => ({
    width: data.getUint16(GIF_SIZE_OFFSET, true),
    height: data.getUint16(GIF_SIZE_OFFSET + 2, true),
  }));
}

function littleEndianUint24(data: DataView, at: number): number {
  return data.getUint16(at, true) + data.getUint8(at + 2) * 0x10000;
}

function webpSize(head: Uint8Array): PictureDimensions | null {
  const chunk = asciiAt(head, WEBP_CHUNK_OFFSET, CHUNK_NAME_BYTES);
  if (chunk === WEBP_LOSSY) {
    return ifFits(head, WEBP_LOSSY_SIZE_OFFSET + 4, (data) => ({
      width: data.getUint16(WEBP_LOSSY_SIZE_OFFSET, true) & FOURTEEN_BIT_MASK,
      height: data.getUint16(WEBP_LOSSY_SIZE_OFFSET + 2, true) & FOURTEEN_BIT_MASK,
    }));
  }
  if (chunk === WEBP_LOSSLESS) {
    return ifFits(head, WEBP_LOSSLESS_BITS_OFFSET + 4, (data) => {
      const bits = data.getUint32(WEBP_LOSSLESS_BITS_OFFSET, true);
      return {
        width: (bits & FOURTEEN_BIT_MASK) + 1,
        height: ((bits >>> LOSSLESS_HEIGHT_SHIFT) & FOURTEEN_BIT_MASK) + 1,
      };
    });
  }
  if (chunk === WEBP_EXTENDED) {
    return ifFits(head, WEBP_EXTENDED_SIZE_OFFSET + 6, (data) => ({
      width: littleEndianUint24(data, WEBP_EXTENDED_SIZE_OFFSET) + 1,
      height: littleEndianUint24(data, WEBP_EXTENDED_SIZE_OFFSET + 3) + 1,
    }));
  }
  return null;
}

/**
 * The size a picture's header claims, read from its first bytes: JPEG, PNG, WebP and GIF. Null
 * for any other format and for a head that is truncated or malformed, so the caller can only
 * rely on it to refuse, never to accept.
 */
export function readPictureDimensions(head: Uint8Array): PictureDimensions | null {
  if (startsWith(head, JPEG_SOI)) return jpegSize(head);
  if (startsWith(head, PNG_SIGNATURE)) return pngSize(head);
  if (asciiAt(head, 0, GIF_SIGNATURE.length) === GIF_SIGNATURE) return gifSize(head);
  if (
    asciiAt(head, 0, RIFF.length) === RIFF &&
    asciiAt(head, WEBP_FORM_OFFSET, CHUNK_NAME_BYTES) === WEBP
  ) {
    return webpSize(head);
  }
  return null;
}
