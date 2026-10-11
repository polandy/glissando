/**
 * The first bytes of music files, built by hand: enough of each format's header for format
 * recognition, without any real audio.
 */

const encoder = new TextEncoder();

export function ascii(text: string): Uint8Array<ArrayBuffer> {
  return encoder.encode(text);
}

export function concat(...parts: readonly Uint8Array[]): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}

function uint32(value: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value);
  return bytes;
}

/** An ISO base media box (MP4, M4A, MOV): size, type, body. */
export function box(type: string, ...body: readonly Uint8Array[]): Uint8Array<ArrayBuffer> {
  const content = concat(...body);
  return concat(uint32(8 + content.length), ascii(type), content);
}

/** An M4A whose one track's first sample entry is `sampleEntry`, the `moov` after `mdat`. */
export function m4a(sampleEntry: string): Uint8Array<ArrayBuffer> {
  const stsd = box("stsd", new Uint8Array(4), uint32(1), box(sampleEntry, new Uint8Array(28)));
  const moov = box(
    "moov",
    box("mvhd", new Uint8Array(100)),
    box("trak", box("mdia", box("minf", box("stbl", stsd)))),
  );
  return concat(
    box("ftyp", ascii("M4A "), new Uint8Array(4)),
    box("mdat", new Uint8Array(64)),
    moov,
  );
}

/** An Ogg file whose first packet starts with `packetStart`. */
export function ogg(packetStart: Uint8Array): Uint8Array<ArrayBuffer> {
  const pageHeader = concat(
    ascii("OggS"),
    new Uint8Array(22),
    Uint8Array.of(1, packetStart.length),
  );
  return concat(pageHeader, packetStart);
}

/** A RIFF WAVE whose `fmt ` chunk names `formatTag`. */
export function wave(formatTag: number): Uint8Array<ArrayBuffer> {
  const fmt = new Uint8Array(16);
  new DataView(fmt.buffer).setUint16(0, formatTag, true);
  const fmtSize = new Uint8Array(4);
  new DataView(fmtSize.buffer).setUint32(0, fmt.length, true);
  return concat(ascii("RIFF"), new Uint8Array(4), ascii("WAVE"), ascii("fmt "), fmtSize, fmt);
}

/** A WebM (Matroska) header that names the audio codec `codecId`, e.g. `A_OPUS`. */
export function webm(codecId: string): Uint8Array<ArrayBuffer> {
  return concat(Uint8Array.of(0x1a, 0x45, 0xdf, 0xa3), new Uint8Array(40), ascii(codecId));
}

/** An AC-3 or E-AC-3 sync frame start whose bitstream id is `bitstreamId`. */
export function dolbyFrame(bitstreamId: number): Uint8Array<ArrayBuffer> {
  return Uint8Array.of(0x0b, 0x77, 0, 0, 0, bitstreamId << 3, 0, 0);
}

export const ASF_HEADER_GUID = Uint8Array.of(
  0x30,
  0x26,
  0xb2,
  0x75,
  0x8e,
  0x66,
  0xcf,
  0x11,
  0xa6,
  0xd9,
  0x00,
  0xaa,
  0x00,
  0x62,
  0xce,
  0x6c,
);
