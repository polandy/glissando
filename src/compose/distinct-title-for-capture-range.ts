import { MAX_TITLE_LENGTH } from "../library/slideshow-edits";
import { dayRangeForCaptureRange } from "./day-range-for-capture-range";
import { titleForCaptureRange } from "./title-for-capture-range";

/** Written between a title and its number, e.g. "July 2025 · 2". */
const TITLE_NUMBER_SEPARATOR = " · ";
/** The first number a repeated title gets. */
const FIRST_TITLE_NUMBER = 2;
const DAY_LENGTH = "YYYY-MM-DD".length;

/** A slideshow already in the library, as far as a new title must keep clear of it. */
export interface ExistingSlideshow {
  readonly title: string;
  /** ISO 8601 capture dates of its pictures. */
  readonly capturedAt: readonly string[];
}

function captureDays(capturedAt: readonly string[]): string {
  const timestamps = capturedAt.map((value) => Date.parse(value));
  const day = (timestamp: number) => new Date(timestamp).toISOString().slice(0, DAY_LENGTH);
  return `${day(Math.min(...timestamps))}/${day(Math.max(...timestamps))}`;
}

function numbered(base: string, taken: ReadonlySet<string>): string {
  for (let number = FIRST_TITLE_NUMBER; ; number += 1) {
    const candidate = `${base}${TITLE_NUMBER_SEPARATOR}${number}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/**
 * The automatic title of a new slideshow that no existing one shares: the month title; else, if
 * a slideshow of the very same capture days has it, the month title numbered; else the day range
 * (numbered when taken too).
 */
export function distinctTitleForCaptureRange(
  capturedAt: readonly string[],
  locale: string,
  existing: readonly ExistingSlideshow[],
): string {
  const taken = new Set(existing.map((slideshow) => slideshow.title));
  const monthTitle = titleForCaptureRange(capturedAt, locale);
  if (!taken.has(monthTitle)) return monthTitle;
  const days = captureDays(capturedAt);
  if (existing.some((slideshow) => captureDays(slideshow.capturedAt) === days)) {
    return numbered(monthTitle, taken);
  }
  const dayRange = dayRangeForCaptureRange(capturedAt, locale);
  return taken.has(dayRange) ? numbered(dayRange, taken) : dayRange;
}

/** The title typed into a field: trimmed and cut like a rename; blank falls back to `automatic`. */
export function typedTitleOrAutomatic(typed: string, automatic: string): string {
  const title = typed.trim().slice(0, MAX_TITLE_LENGTH).trim();
  return title === "" ? automatic : title;
}
