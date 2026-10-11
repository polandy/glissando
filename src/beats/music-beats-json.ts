import type { MusicBeats } from "./music-beats";

const NONE_KEYS: ReadonlySet<string> = new Set(["kind"]);
const BEATS_KEYS: ReadonlySet<string> = new Set(["kind", "beatsMs", "beatsPerMinute"]);

/**
 * The boundary check of a `MusicBeats` read from JSON (ADR-0021): the server and the client both
 * read it from storage they do not fully trust, so both go through this one check.
 */
export function parseMusicBeats(value: unknown): MusicBeats | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const { kind } = value as Record<string, unknown>;
  if (kind === "none") {
    return hasOnlyKeys(value, NONE_KEYS) ? { kind: "none" } : undefined;
  }
  if (kind !== "beats" || !hasOnlyKeys(value, BEATS_KEYS)) {
    return undefined;
  }
  const { beatsMs, beatsPerMinute } = value as Record<string, unknown>;
  return Array.isArray(beatsMs) &&
    beatsMs.every(isAscendingBeatMs) &&
    isPositiveTempo(beatsPerMinute)
    ? { kind: "beats", beatsMs: [...beatsMs], beatsPerMinute }
    : undefined;
}

function isAscendingBeatMs(ms: unknown, index: number, beatsMs: readonly unknown[]): boolean {
  if (typeof ms !== "number" || !Number.isSafeInteger(ms) || ms < 0) {
    return false;
  }
  const previous = beatsMs[index - 1];
  return index === 0 || (typeof previous === "number" && ms > previous);
}

function isPositiveTempo(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function hasOnlyKeys(value: object, known: ReadonlySet<string>): boolean {
  return Object.keys(value).every((key) => known.has(key));
}
