const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;
const MONTHS_PER_YEAR = 12;

/** The first instant of the month after `month` (`YYYY-MM`) in UTC: the `takenBefore` of a jump. */
export function monthEnd(month: string): string {
  const parts = MONTH_PATTERN.exec(month);
  const monthNumber = Number(parts?.[2]);
  if (parts === null || monthNumber < 1 || monthNumber > MONTHS_PER_YEAR) {
    throw new Error(`the month "${month}" is not "YYYY-MM"; pass e.g. "2025-12"`);
  }
  return new Date(Date.UTC(Number(parts[1]), monthNumber, 1)).toISOString();
}
