/**
 * How much wider `separator` renders than a bare " · " in the same place, in CSS pixels: the room
 * the dot gets beyond the font's own spaces, both sides together.
 */
export function separatorRoom(separator: HTMLElement): number {
  const bare = document.createElement("span");
  bare.textContent = separator.textContent;
  separator.after(bare);
  const room = separator.getBoundingClientRect().width - bare.getBoundingClientRect().width;
  bare.remove();
  return room;
}
