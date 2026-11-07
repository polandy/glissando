import { describe, expect, it } from "vitest";
import { readPictureDimensions } from "./picture-dimensions";

const bytes = (...values: number[]): Uint8Array => Uint8Array.from(values);
const ascii = (text: string): number[] => [...text].map((letter) => letter.charCodeAt(0));
const beUint16 = (value: number): number[] => [value >> 8, value & 0xff];
const beUint32 = (value: number): number[] => [
  ...beUint16(value >>> 16),
  ...beUint16(value & 0xffff),
];
const leUint16 = (value: number): number[] => [value & 0xff, value >> 8];
const leUint24 = (value: number): number[] => [value & 0xff, (value >> 8) & 0xff, value >> 16];

/** Markers up to the frame: SOI, an APP1 segment of `appBytes` filler, then the frame marker. */
function jpeg(marker: number, width: number, height: number, appBytes = 0): Uint8Array {
  const precision = 8;
  return bytes(
    0xff,
    0xd8,
    0xff,
    0xe1,
    ...beUint16(appBytes + 2),
    ...new Array<number>(appBytes).fill(0),
    0xff,
    marker,
    ...beUint16(11),
    precision,
    ...beUint16(height),
    ...beUint16(width),
    3,
  );
}

function png(width: number, height: number): Uint8Array {
  return bytes(
    0x89,
    ...ascii("PNG"),
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...beUint32(13),
    ...ascii("IHDR"),
    ...beUint32(width),
    ...beUint32(height),
  );
}

const riff = (...chunk: number[]): Uint8Array =>
  bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP"), ...chunk);

function webpLossy(width: number, height: number): Uint8Array {
  return riff(
    ...ascii("VP8 "),
    0,
    0,
    0,
    0,
    0x10,
    0x02,
    0x00,
    0x9d,
    0x01,
    0x2a,
    ...leUint16(width),
    ...leUint16(height),
  );
}

function webpLossless(width: number, height: number): Uint8Array {
  const packed = ((height - 1) << 14) | (width - 1);
  return riff(
    ...ascii("VP8L"),
    0,
    0,
    0,
    0,
    0x2f,
    packed & 0xff,
    (packed >> 8) & 0xff,
    (packed >> 16) & 0xff,
    (packed >>> 24) & 0xff,
  );
}

function webpExtended(width: number, height: number): Uint8Array {
  return riff(
    ...ascii("VP8X"),
    10,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    ...leUint24(width - 1),
    ...leUint24(height - 1),
  );
}

const gif = (width: number, height: number): Uint8Array =>
  bytes(...ascii("GIF89a"), ...leUint16(width), ...leUint16(height), 0, 0, 0);

describe("readPictureDimensions", () => {
  it.each([
    ["a baseline JPEG", jpeg(0xc0, 6000, 4000), 6000, 4000],
    ["a progressive JPEG", jpeg(0xc2, 640, 480), 640, 480],
    ["a lossless JPEG", jpeg(0xc3, 640, 480), 640, 480],
    ["a JPEG with EXIF before the frame", jpeg(0xc0, 4032, 3024, 60_000), 4032, 3024],
    ["a PNG", png(50_000, 40_000), 50_000, 40_000],
    ["a lossy WebP", webpLossy(1920, 1080), 1920, 1080],
    ["a lossless WebP", webpLossless(16_384, 9_000), 16_384, 9_000],
    ["an extended WebP", webpExtended(20_000, 30_000), 20_000, 30_000],
    ["a GIF", gif(320, 200), 320, 200],
  ])("reads the size of %s", (_name, head, width, height) => {
    expect(readPictureDimensions(head)).toEqual({ width, height });
  });

  it.each([
    ["an empty head", bytes()],
    ["a text file", bytes(...ascii("not a picture at all"))],
    ["an HEIC or AVIF container", bytes(0, 0, 0, 24, ...ascii("ftypavif"), 0, 0, 0, 0)],
    ["a BMP", bytes(...ascii("BM"), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)],
    ["a truncated JPEG", jpeg(0xc0, 640, 480).subarray(0, 10)],
    ["a JPEG whose frame lies beyond the head", jpeg(0xc0, 640, 480, 60_000).subarray(0, 4096)],
    ["a JPEG that ends before any frame", bytes(0xff, 0xd8, 0xff, 0xd9)],
    ["a JPEG whose segment length is nonsense", bytes(0xff, 0xd8, 0xff, 0xe1, 0, 0, 0, 0)],
    ["a JPEG DHT marker mistaken for a frame", jpeg(0xc4, 640, 480)],
    ["a truncated PNG", png(10, 10).subarray(0, 20)],
    ["a truncated WebP", webpLossy(10, 10).subarray(0, 24)],
    ["a truncated GIF", gif(10, 10).subarray(0, 8)],
  ])("gives no size for %s", (_name, head) => {
    expect(readPictureDimensions(head)).toBeNull();
  });
});
