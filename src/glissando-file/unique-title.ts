const FIRST_NUMBER = 2;

/** `title`, or with the first free number " (2)", " (3)" … when another slideshow has it. */
export function uniqueTitle(title: string, existingTitles: readonly string[]): string {
  const taken = new Set(existingTitles);
  if (!taken.has(title)) {
    return title;
  }
  let number = FIRST_NUMBER;
  while (taken.has(`${title} (${number})`)) {
    number++;
  }
  return `${title} (${number})`;
}
