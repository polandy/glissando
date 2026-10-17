import { describe, expect, it } from "vitest";
import { readPictureHeader } from "./picture-header";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function png(width: number, height: number): Blob {
  const bytes = new Uint8Array(24);
  bytes.set(PNG_SIGNATURE, 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13); // IHDR chunk's data length
  bytes.set([0x49, 0x48, 0x44, 0x52], 12); // "IHDR"
  view.setUint32(16, width);
  view.setUint32(20, height);
  return new Blob([bytes]);
}

/** A JPEG with one APP0 segment before SOF0, so reading its size exercises the segment walk. */
function jpeg(width: number, height: number): Blob {
  const app0 = [0xff, 0xe0, 0x00, 0x10, ...new Array<number>(14).fill(0)];
  const sof0 = [
    0xff,
    0xc0,
    0x00,
    0x11, // length 17
    0x08, // precision
    (height >> 8) & 0xff,
    height & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    0x03, // 3 components
    ...new Array<number>(9).fill(0),
  ];
  return new Blob([new Uint8Array([0xff, 0xd8, ...app0, ...sof0])]);
}

function webpChunkHeader(chunkType: string, payloadLength: number): number[] {
  const type = [...chunkType].map((char) => char.charCodeAt(0));
  const size = payloadLength;
  return [
    ...[..."RIFF"].map((char) => char.charCodeAt(0)),
    0,
    0,
    0,
    0, // file size, unchecked by the reader
    ...[..."WEBP"].map((char) => char.charCodeAt(0)),
    ...type,
    size & 0xff,
    (size >> 8) & 0xff,
    (size >> 16) & 0xff,
    (size >> 24) & 0xff,
  ];
}

function webpLossy(width: number, height: number): Blob {
  const payload = [
    0,
    0,
    0, // frame tag
    0x9d,
    0x01,
    0x2a, // start code
    width & 0xff,
    (width >> 8) & 0x3f,
    height & 0xff,
    (height >> 8) & 0x3f,
  ];
  return new Blob([new Uint8Array([...webpChunkHeader("VP8 ", payload.length), ...payload])]);
}

function webpLossless(width: number, height: number): Blob {
  const bits = ((width - 1) & 0x3fff) | (((height - 1) & 0x3fff) << 14);
  const payload = [0x2f, bits & 0xff, (bits >> 8) & 0xff, (bits >> 16) & 0xff, (bits >> 24) & 0xff];
  return new Blob([new Uint8Array([...webpChunkHeader("VP8L", payload.length), ...payload])]);
}

function webpExtended(width: number, height: number): Blob {
  const widthMinusOne = width - 1;
  const heightMinusOne = height - 1;
  const payload = [
    0, // flags
    0,
    0,
    0, // reserved
    widthMinusOne & 0xff,
    (widthMinusOne >> 8) & 0xff,
    (widthMinusOne >> 16) & 0xff,
    heightMinusOne & 0xff,
    (heightMinusOne >> 8) & 0xff,
    (heightMinusOne >> 16) & 0xff,
  ];
  return new Blob([new Uint8Array([...webpChunkHeader("VP8X", payload.length), ...payload])]);
}

describe("readPictureHeader", () => {
  it.each([
    ["a PNG", () => png(40, 30), { width: 40, height: 30 }],
    ["a JPEG with a leading APP0 segment", () => jpeg(640, 480), { width: 640, height: 480 }],
    ["a lossy WebP", () => webpLossy(100, 80), { width: 100, height: 80 }],
    ["a lossless WebP", () => webpLossless(100, 80), { width: 100, height: 80 }],
    ["an extended WebP", () => webpExtended(100, 80), { width: 100, height: 80 }],
  ])("reads %s's size from its header", async (_, build, expected) => {
    expect(await readPictureHeader(build())).toEqual(expected);
  });

  it.each([
    ["an empty file", () => new Blob([])],
    ["plain text", () => new Blob(["not a picture"])],
    ["a PNG cut before its IHDR chunk", () => png(40, 30).slice(0, 10)],
    ["a JPEG cut before its SOF0 segment", () => jpeg(640, 480).slice(0, 4)],
    [
      "a WebP of an unknown chunk type",
      () => new Blob([new Uint8Array(webpChunkHeader("ANIM", 0))]),
    ],
  ])("finds no size in %s", async (_, build) => {
    expect(await readPictureHeader(build())).toBeNull();
  });
});
