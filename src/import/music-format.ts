/** Formats Glissando converts to FLAC on the device, because a target browser cannot decode them (ADR-0020). */
export const CONVERTIBLE_SOURCES = [
  "alac",
  "aiff",
  "caf",
  "ac3",
  "eac3",
  "wma",
  "amr",
  "vorbis",
] as const;
export type ConvertibleSource = (typeof CONVERTIBLE_SOURCES)[number];

/**
 * The file picker's `accept`: every audio type, plus the extensions of every format recognised
 * here, because iPadOS greys out a file whose type it cannot tell from where it is stored.
 */
export const MUSIC_FILE_PICKER_ACCEPT = [
  "audio/*",
  ...[".mp3", ".m4a", ".aac", ".flac", ".ogg", ".oga", ".opus", ".wav", ".webm"],
  ...[".aif", ".aiff", ".aifc", ".caf", ".ac3", ".eac3", ".wma", ".amr"],
].join(",");

/**
 * - `playable`: Chromium, Firefox and Safari all decode it, so it is stored as it is.
 * - `convertible`: one of them does not, so a FLAC copy is stored instead.
 * - `protected`: DRM; no browser may decode it.
 * - `unknown`: not recognised; the browser decides whether it plays.
 */
export type MusicFormat =
  | { readonly kind: "playable" }
  | { readonly kind: "convertible"; readonly source: ConvertibleSource }
  | { readonly kind: "protected" }
  | { readonly kind: "unknown" };

const PLAYABLE: MusicFormat = { kind: "playable" };
const PROTECTED: MusicFormat = { kind: "protected" };
const UNKNOWN: MusicFormat = { kind: "unknown" };

function convertible(source: ConvertibleSource): MusicFormat {
  return { kind: "convertible", source };
}

/** Enough of a file's start for every header but MP4's, whose `moov` may sit at the end. */
const HEAD_BYTES = 64 * 1024;
/** WebM names its codec in the track header, well inside the head. */
const WEBM_CODEC_IDS: Readonly<Record<string, MusicFormat>> = {
  A_OPUS: PLAYABLE,
  A_VORBIS: convertible("vorbis"),
};
const WAVE_PLAYABLE_FORMAT_TAGS: readonly number[] = [
  0x0001, // integer PCM
  0x0003, // float PCM
  0xfffe, // extensible
];
/** The bitstream id above which a Dolby frame is E-AC-3 rather than AC-3. */
const AC3_MAX_BITSTREAM_ID = 10;
const ASF_HEADER_GUID = [
  0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11, 0xa6, 0xd9, 0x00, 0xaa, 0x00, 0x62, 0xce, 0x6c,
];
/** MP4 sample entries by their four-character code. */
const MP4_SAMPLE_ENTRIES: Readonly<Record<string, MusicFormat>> = {
  mp4a: PLAYABLE,
  ".mp3": PLAYABLE,
  Opus: PLAYABLE,
  fLaC: PLAYABLE,
  alac: convertible("alac"),
  "ac-3": convertible("ac3"),
  "ec-3": convertible("eac3"),
  drms: PROTECTED,
};
/** The boxes on the way from the file to the first sample entry. */
const MP4_PATH_TO_SAMPLE_DESCRIPTIONS = ["moov", "trak", "mdia", "minf", "stbl", "stsd"];
const MP4_BOX_HEADER_BYTES = 8;
/** `stsd`: version and flags, then the entry count, then the entries. */
const MP4_SAMPLE_DESCRIPTIONS_HEADER_BYTES = 8;

/** Recognises a music file's format from its bytes, never from its name or MIME type. */
export async function recogniseMusicFormat(file: Blob): Promise<MusicFormat> {
  const head = new Uint8Array(await file.slice(0, HEAD_BYTES).arrayBuffer());
  const text = (offset: number, length: number): string =>
    String.fromCharCode(...head.subarray(offset, offset + length));

  if (text(0, 3) === "ID3" || text(0, 4) === "fLaC") return PLAYABLE;
  if (isMpegAudioFrame(head)) return PLAYABLE;
  if (text(0, 4) === "OggS") return oggFormat(head);
  if (text(0, 4) === "RIFF" && text(8, 4) === "WAVE") return waveFormat(head);
  if (text(0, 4) === "FORM" && ["AIFF", "AIFC"].includes(text(8, 4))) return convertible("aiff");
  if (text(0, 4) === "caff") return convertible("caf");
  if (text(0, 6) === "#!AMR\n") return convertible("amr");
  if (startsWith(head, ASF_HEADER_GUID)) return convertible("wma");
  if (head[0] === 0x0b && head[1] === 0x77) return dolbyFormat(head);
  if (startsWith(head, [0x1a, 0x45, 0xdf, 0xa3])) return webmFormat(head);
  if (text(4, 4) === "ftyp") return mp4Format(file);
  return UNKNOWN;
}

function startsWith(bytes: Uint8Array, prefix: readonly number[]): boolean {
  return prefix.every((byte, index) => bytes[index] === byte);
}

/** An MP3 or ADTS AAC frame: eleven sync bits. */
function isMpegAudioFrame(head: Uint8Array): boolean {
  return head[0] === 0xff && ((head[1] ?? 0) & 0xe0) === 0xe0;
}

function oggFormat(head: Uint8Array): MusicFormat {
  const segmentCount = head[26] ?? 0;
  const packet = head.subarray(27 + segmentCount);
  const packetText = (offset: number, length: number): string =>
    String.fromCharCode(...packet.subarray(offset, offset + length));
  if (packetText(0, 8) === "OpusHead") return PLAYABLE;
  if (packet[0] === 0x7f && packetText(1, 4) === "FLAC") return PLAYABLE;
  if (packet[0] === 1 && packetText(1, 6) === "vorbis") return convertible("vorbis");
  return UNKNOWN;
}

/** The format tag of the `fmt ` chunk, which follows the RIFF header directly. */
function waveFormat(head: Uint8Array): MusicFormat {
  const view = new DataView(head.buffer, head.byteOffset, head.byteLength);
  const fmtTagOffset = 20;
  if (head.byteLength < fmtTagOffset + 2) return UNKNOWN;
  const formatTag = view.getUint16(fmtTagOffset, true);
  return WAVE_PLAYABLE_FORMAT_TAGS.includes(formatTag) ? PLAYABLE : UNKNOWN;
}

function dolbyFormat(head: Uint8Array): MusicFormat {
  const bitstreamId = (head[5] ?? 0) >> 3;
  return convertible(bitstreamId > AC3_MAX_BITSTREAM_ID ? "eac3" : "ac3");
}

function webmFormat(head: Uint8Array): MusicFormat {
  const text = new TextDecoder("latin1").decode(head);
  for (const [codecId, format] of Object.entries(WEBM_CODEC_IDS)) {
    if (text.includes(codecId)) return format;
  }
  return UNKNOWN;
}

/** Walks the box tree to the first track's first sample entry, reading only box headers. */
async function mp4Format(file: Blob): Promise<MusicFormat> {
  const read = async (offset: number, length: number): Promise<DataView> =>
    new DataView(await file.slice(offset, offset + length).arrayBuffer());
  let start = 0;
  let end = file.size;
  for (const wanted of MP4_PATH_TO_SAMPLE_DESCRIPTIONS) {
    const found = await findBox(read, start, end, wanted);
    if (found === null) return UNKNOWN;
    start = found.bodyStart;
    end = found.end;
  }
  const entry = await read(start + MP4_SAMPLE_DESCRIPTIONS_HEADER_BYTES, MP4_BOX_HEADER_BYTES);
  if (entry.byteLength < MP4_BOX_HEADER_BYTES) return UNKNOWN;
  return MP4_SAMPLE_ENTRIES[fourCharacterCode(entry, 4)] ?? UNKNOWN;
}

async function findBox(
  read: (offset: number, length: number) => Promise<DataView>,
  start: number,
  end: number,
  wanted: string,
): Promise<{ bodyStart: number; end: number } | null> {
  let offset = start;
  while (offset + MP4_BOX_HEADER_BYTES <= end) {
    const header = await read(offset, MP4_BOX_HEADER_BYTES);
    const size = header.getUint32(0);
    const boxEnd = offset + size;
    // Sizes 0 ("to the end") and 1 (64-bit) do not occur on the way to `stsd` in music files.
    if (size < MP4_BOX_HEADER_BYTES || boxEnd > end) return null;
    if (fourCharacterCode(header, 4) === wanted) {
      return { bodyStart: offset + MP4_BOX_HEADER_BYTES, end: boxEnd };
    }
    offset = boxEnd;
  }
  return null;
}

function fourCharacterCode(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
}
