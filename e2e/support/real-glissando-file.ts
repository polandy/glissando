import { deflateSync } from "node:zlib";
import { crc32 } from "../../src/glissando-file/crc32";
import { exportSlideshow } from "../../src/glissando-file/export-slideshow";
import {
  EXPORTED_SLIDESHOW,
  MODIFIED_AT,
} from "../../src/glissando-file/testing/glissando-fixtures";
import { silentWav } from "../../src/import/testing/silent-wav";
import { MemoryLibraryStore } from "../../src/library/testing/memory-store";
import { blobFile, type TestFile } from "./media";

/**
 * `glissando-fixtures.ts`'s `exportedFile` stands in for a picture or a song with a header-only
 * fake, which a unit test's `fakeMediaDecoders` never actually decodes. Opening the file for real
 * (ADR-0038) decodes every medium with the browser's own codecs, which a fake fails, so an e2e
 * case needs a .glissando file whose media truly decode.
 */

const PNG_SIGNATURE = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const BIT_DEPTH_EIGHT = 8;
const GREYSCALE_COLOUR_TYPE = 0;
const NO_COMPRESSION_OR_FILTER_OR_INTERLACE = Uint8Array.from([0, 0, 0]);
const ROW_FILTER_NONE = 0;
const GREY_PIXEL_VALUE = 0x80;
/** Long enough that `decodeAudioData` has something to decode; its exact length is never checked. */
const SILENT_MUSIC_MS = 500;

function bigEndianUint32(value: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value);
  return bytes;
}

function concat(parts: readonly Uint8Array[]): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    bytes.set(part, at);
    at += part.length;
  }
  return bytes;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array<ArrayBuffer> {
  const typeAndData = concat([Uint8Array.from([...type].map((c) => c.charCodeAt(0))), data]);
  return concat([bigEndianUint32(data.length), typeAndData, bigEndianUint32(crc32(typeAndData))]);
}

/** A real, decodable greyscale PNG of `width`×`height`, flat grey: the browser's own codec reads it. */
function tinyPng(width: number, height: number): Uint8Array<ArrayBuffer> {
  const rowBytes = 1 + width;
  const raw = new Uint8Array(rowBytes * height);
  for (let row = 0; row < height; row++) {
    raw[row * rowBytes] = ROW_FILTER_NONE;
    raw.fill(GREY_PIXEL_VALUE, row * rowBytes + 1, (row + 1) * rowBytes);
  }
  const ihdr = concat([
    bigEndianUint32(width),
    bigEndianUint32(height),
    Uint8Array.from([BIT_DEPTH_EIGHT, GREYSCALE_COLOUR_TYPE]),
    NO_COMPRESSION_OR_FILTER_OR_INTERLACE,
  ]);
  return concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", new Uint8Array(0)),
  ]);
}

/**
 * `exportedFile`'s slideshow ("Herbst in Wien"), exported with real, decodable media in place of
 * the unit-test fixture's header-only pictures and text standing in for music.
 */
export async function exportedFileWithRealMedia(): Promise<TestFile> {
  const store = new MemoryLibraryStore();
  const picture = (width: number, height: number): Blob =>
    new Blob([tinyPng(width, height)], { type: "image/png" });
  await store.putPicture("src-p1", { display: picture(40, 30), thumbnail: picture(40, 30) });
  await store.putPicture("src-p2", { display: picture(40, 30), thumbnail: picture(40, 30) });
  await store.putMusic("src-m1", new Blob([silentWav(SILENT_MUSIC_MS)], { type: "audio/wav" }));
  const file = await exportSlideshow(EXPORTED_SLIDESHOW, store, { modifiedAt: MODIFIED_AT });
  return blobFile("Herbst in Wien.glissando", file);
}
