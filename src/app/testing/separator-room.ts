/**
 * How much wider `separator` renders than the same " · " without its styling, in CSS pixels: the
 * room the dot gets beyond the font's own spaces. Measured in place, so the spaces around the dot
 * collapse and wrap the same way in both measurements.
 */
export function separatorRoom(separator: HTMLElement): number {
  const styled = separator.getBoundingClientRect().width;
  const classes = separator.className;
  separator.className = "";
  const bare = separator.getBoundingClientRect().width;
  separator.className = classes;
  return styled - bare;
}
