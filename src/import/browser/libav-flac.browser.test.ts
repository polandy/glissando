import { describe, expect, it } from "vitest";
import { UnconvertibleMusicError } from "../music-conversion";
import { recogniseMusicFormat, type ConvertibleSource } from "../music-format";
import ac3Url from "../testing/audio/ac3.ac3?url";
import aiffUrl from "../testing/audio/aiff.aiff?url";
import alacUrl from "../testing/audio/alac.m4a?url";
import amrUrl from "../testing/audio/amr.amr?url";
import cafUrl from "../testing/audio/caf-alac.caf?url";
import eac3Url from "../testing/audio/eac3.eac3?url";
import vorbisOggUrl from "../testing/audio/vorbis.ogg?url";
import vorbisWebmUrl from "../testing/audio/vorbis.webm?url";
import wmaUrl from "../testing/audio/wma.wma?url";
import { toneAiff } from "../testing/tone-aiff";
import { convertToFlac } from "./libav-flac";

/** Half a second of a generated sine tone in each format (scripts/make-audio-fixtures.sh). */
const FIXTURES: readonly [string, string, ConvertibleSource, number][] = [
  ["Apple Lossless, 24-bit", alacUrl, "alac", 2],
  ["AIFF", aiffUrl, "aiff", 2],
  ["Apple Lossless in CAF", cafUrl, "caf", 2],
  ["AC-3", ac3Url, "ac3", 2],
  ["E-AC-3", eac3Url, "eac3", 2],
  ["WMA", wmaUrl, "wma", 2],
  ["AMR", amrUrl, "amr", 1],
  ["Vorbis in Ogg", vorbisOggUrl, "vorbis", 2],
  ["Vorbis in WebM", vorbisWebmUrl, "vorbis", 2],
];
const TONE_SECONDS = 0.5;
/** Lossy codecs pad a few milliseconds of priming and padding. */
const DURATION_TOLERANCE_SECONDS = 0.05;

async function fixture(url: string, name: string): Promise<File> {
  return new File([await (await fetch(url)).blob()], name);
}

const unaborted = (): AbortSignal => new AbortController().signal;

describe("convertToFlac, the own libav.js build (ADR-0020)", () => {
  it.each(FIXTURES)(
    "turns %s into a FLAC file the browser decodes",
    async (_name, url, source, channels) => {
      const file = await fixture(url, "Evening Walk.bin");
      expect(await recogniseMusicFormat(file)).toEqual({ kind: "convertible", source });
      const progress: number[] = [];

      const flac = await convertToFlac(file, (fraction) => progress.push(fraction), unaborted());

      expect(flac.name).toBe("Evening Walk.flac");
      expect(flac.type).toBe("audio/flac");
      const decoded = await new OfflineAudioContext(1, 1, 44_100).decodeAudioData(
        await flac.arrayBuffer(),
      );
      expect(decoded.numberOfChannels).toBe(channels);
      expect(Math.abs(decoded.duration - TONE_SECONDS)).toBeLessThan(DURATION_TOLERANCE_SECONDS);
      expect(progress.at(-1)).toBe(1);
    },
  );

  it("converts a track longer than one read step, reporting progress on the way", async () => {
    const tenSeconds = new File([toneAiff(10)], "Long.aiff");
    expect(tenSeconds.size).toBeGreaterThan(1.5 * 1024 * 1024);
    const progress: number[] = [];

    const flac = await convertToFlac(
      tenSeconds,
      (fraction) => progress.push(fraction),
      unaborted(),
    );

    const decoded = await new OfflineAudioContext(1, 1, 44_100).decodeAudioData(
      await flac.arrayBuffer(),
    );
    expect(Math.abs(decoded.duration - 10)).toBeLessThan(DURATION_TOLERANCE_SECONDS);
    expect(progress.some((fraction) => fraction > 0 && fraction < 1)).toBe(true);
    expect(progress.at(-1)).toBe(1);
  });

  it("rejects a file it cannot read with UnconvertibleMusicError", async () => {
    const text = new File(["not music at all"], "notes.wma");

    await expect(convertToFlac(text, () => undefined, unaborted())).rejects.toBeInstanceOf(
      UnconvertibleMusicError,
    );
  });

  it("stops with an AbortError once cancelled", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      convertToFlac(await fixture(wmaUrl, "Concert.wma"), () => undefined, controller.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
