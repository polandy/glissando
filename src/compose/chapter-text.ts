/**
 * Rule D, `TRIP_CHAPTERS.md`: a chapter's localised text (German/English). `Intl`'s own
 * `formatRange` does not reproduce the required punctuation (no spaces around the dash, day
 * before month), so the date range is hand-assembled from individually formatted names plus
 * literal glue characters.
 */

const DASH = "–";
const SEPARATOR = " · ";

function isGerman(locale: string): boolean {
  return locale.toLowerCase().startsWith("de");
}

/** "Day" or "Tag", the word the subtitle and the no-place title lead with. */
function dayWord(locale: string): string {
  return isGerman(locale) ? "Tag" : "Day";
}

function monthName(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(date);
}

function weekdayName(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(date);
}

/** The day of month, with German's trailing dot ("14." vs plain "14"). */
function dayOfMonth(date: Date, locale: string): string {
  const day = date.getUTCDate();
  return isGerman(locale) ? `${day}.` : `${day}`;
}

/** "14–20 June" (same month) or "28 June – 2 July" (cross-month), in `locale`'s day-month order. */
function dateRange(startedAt: Date, endedAt: Date, locale: string): string {
  if (startedAt.getUTCMonth() === endedAt.getUTCMonth()) {
    const month = monthName(endedAt, locale);
    const startDay = dayOfMonth(startedAt, locale);
    const endDay = dayOfMonth(endedAt, locale);
    return `${startDay}${DASH}${endDay} ${month}`;
  }
  const start = `${dayOfMonth(startedAt, locale)} ${monthName(startedAt, locale)}`;
  const end = `${dayOfMonth(endedAt, locale)} ${monthName(endedAt, locale)}`;
  return `${start} – ${end}`;
}

/** "Day 3–9 · 14–20 June" / "Tag 3–9 · 14.–20. Juni", for a stay spanning more than one day. */
export function multiDaySubtitle(
  startDay: number,
  endDay: number,
  startedAt: Date,
  endedAt: Date,
  locale: string,
): string {
  return `${dayWord(locale)} ${startDay}${DASH}${endDay}${SEPARATOR}${dateRange(startedAt, endedAt, locale)}`;
}

/** "Day 10 · Saturday, 21 June" / "Tag 10 · Samstag, 21. Juni", for a single-day stay or chapter. */
export function singleDaySubtitle(day: number, at: Date, locale: string): string {
  return `${dayWord(locale)} ${day}${SEPARATOR}${dateOnlySubtitle(at, locale)}`;
}

/** "Saturday, 21 June" / "Samstag, 21. Juni" — the weekday and date alone, no day number. */
export function dateOnlySubtitle(at: Date, locale: string): string {
  return `${weekdayName(at, locale)}, ${dayOfMonth(at, locale)} ${monthName(at, locale)}`;
}

/** "Day 3" / "Tag 3" — a manual chapter's title when its day has no place. */
export function dayTitle(day: number, locale: string): string {
  return `${dayWord(locale)} ${day}`;
}
