import { describe, expect, it } from "vitest";
import { MUSIC_FILE_PICKER_ACCEPT, recogniseMusicFormat, type MusicFormat } from "./music-format";
import {
  ASF_HEADER_GUID,
  ascii,
  concat,
  dolbyFrame,
  m4a,
  ogg,
  wave,
  webm,
} from "./testing/music-headers";

function recognise(bytes: Uint8Array<ArrayBuffer>): Promise<MusicFormat> {
  return recogniseMusicFormat(new File([bytes], "music"));
}

const PLAYABLE: MusicFormat = { kind: "playable" };

describe("recogniseMusicFormat, which music every target browser plays and which is converted", () => {
  it.each([
    ["MP3 with an ID3 tag", concat(ascii("ID3"), new Uint8Array(20))],
    ["MP3 without a tag", Uint8Array.of(0xff, 0xfb, 0x90, 0x64, 0, 0)],
    ["AAC in ADTS", Uint8Array.of(0xff, 0xf1, 0x50, 0x80, 0, 0)],
    ["AAC in M4A", m4a("mp4a")],
    ["FLAC", concat(ascii("fLaC"), new Uint8Array(30))],
    ["FLAC in Ogg", ogg(concat(Uint8Array.of(0x7f), ascii("FLAC")))],
    ["Opus in Ogg", ogg(ascii("OpusHead"))],
    ["Opus in WebM", webm("A_OPUS")],
    ["WAV with PCM", wave(1)],
    ["WAV with floats", wave(3)],
    ["WAV with an extensible format", wave(0xfffe)],
  ])("plays %s as it is", async (_name, bytes) => {
    expect(await recognise(bytes)).toEqual(PLAYABLE);
  });

  it.each([
    ["Apple Lossless in M4A", m4a("alac"), "alac"],
    ["AIFF", concat(ascii("FORM"), new Uint8Array(4), ascii("AIFF")), "aiff"],
    ["AIFF-C", concat(ascii("FORM"), new Uint8Array(4), ascii("AIFC")), "aiff"],
    ["CAF", concat(ascii("caff"), new Uint8Array(12)), "caf"],
    ["AC-3", dolbyFrame(8), "ac3"],
    ["AC-3 in M4A", m4a("ac-3"), "ac3"],
    ["E-AC-3", dolbyFrame(16), "eac3"],
    ["E-AC-3 in M4A", m4a("ec-3"), "eac3"],
    ["WMA", concat(ASF_HEADER_GUID, new Uint8Array(14)), "wma"],
    ["AMR", ascii("#!AMR\n<"), "amr"],
    ["Vorbis in Ogg", ogg(concat(Uint8Array.of(1), ascii("vorbis"))), "vorbis"],
    ["Vorbis in WebM", webm("A_VORBIS"), "vorbis"],
  ] as const)("converts %s", async (_name, bytes, source) => {
    expect(await recognise(bytes)).toEqual({ kind: "convertible", source });
  });

  it("knows an iTunes Store track with DRM as protected", async () => {
    expect(await recognise(m4a("drms"))).toEqual({ kind: "protected" });
  });

  it.each([
    ["text", ascii("not audio at all")],
    ["an empty file", new Uint8Array(0)],
    ["a WAV with a compressed format", wave(0x11)],
    ["an M4A whose box sizes run past the file", concat(m4a("mp4a").subarray(0, 40))],
  ])("does not know %s", async (_name, bytes) => {
    expect(await recognise(bytes)).toEqual({ kind: "unknown" });
  });
});

describe("MUSIC_FILE_PICKER_ACCEPT, what the file picker offers", () => {
  const accepted = MUSIC_FILE_PICKER_ACCEPT.split(",");

  it("offers every audio type a browser knows", () => {
    expect(accepted).toContain("audio/*");
  });

  // iPadOS greys out a file whose type it cannot tell from its location (SMB, cloud providers)
  // unless the picker names its extension.
  it.each([
    ".mp3",
    ".m4a",
    ".aac",
    ".flac",
    ".ogg",
    ".oga",
    ".opus",
    ".wav",
    ".webm",
    ".aif",
    ".aiff",
    ".aifc",
    ".caf",
    ".ac3",
    ".eac3",
    ".wma",
    ".amr",
  ])("offers %s files by their extension", (extension) => {
    expect(accepted).toContain(extension);
  });
});
