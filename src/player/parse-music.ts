import {
  readNonEmptyString,
  readNonNegativeInteger,
  readObject,
  readPositiveFiniteNumber,
  SlideshowFormatError,
  type JsonObject,
} from "./parse-primitives";
import type { MusicTrack } from "./slideshow";

const TRACK_TIMES = ["startMs", "endMs", "fadeInMs", "fadeOutMs"] as const;

export function readTracks(value: unknown): readonly MusicTrack[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new SlideshowFormatError("music", "an array with at least one track", value);
  }
  let previousAtMs = 0;
  return value.map((item: unknown, index) => {
    const path = `music[${index}]`;
    const fields = readObject(item, path, ["src", "atMs", "gain", ...TRACK_TIMES]);
    const atMs = readNonNegativeInteger(fields.atMs, `${path}.atMs`);
    if (atMs < previousAtMs) {
      throw new SlideshowFormatError(
        `${path}.atMs`,
        `at least the previous track's atMs (${previousAtMs})`,
        atMs,
      );
    }
    previousAtMs = atMs;
    return { ...readTrack(fields, path), atMs };
  });
}

function readTrack(track: JsonObject, path: string): Omit<MusicTrack, "atMs"> {
  const startMs = readNonNegativeInteger(track.startMs, `${path}.startMs`);
  const endMs = readNonNegativeInteger(track.endMs, `${path}.endMs`);
  if (endMs <= startMs) {
    throw new SlideshowFormatError(`${path}.endMs`, `a time after startMs (${startMs})`, endMs);
  }
  const fadeInMs = readNonNegativeInteger(track.fadeInMs, `${path}.fadeInMs`);
  const fadeOutMs = readNonNegativeInteger(track.fadeOutMs, `${path}.fadeOutMs`);
  const heardMs = endMs - startMs;
  if (fadeInMs + fadeOutMs > heardMs) {
    throw new SlideshowFormatError(
      `${path}.fadeOutMs`,
      `fadeInMs + fadeOutMs at most endMs − startMs (${heardMs})`,
      fadeOutMs,
    );
  }
  const gain = readPositiveFiniteNumber(track.gain, `${path}.gain`);
  return {
    src: readNonEmptyString(track.src, `${path}.src`),
    startMs,
    endMs,
    fadeInMs,
    fadeOutMs,
    gain,
  };
}
