import type { Message } from "./messages.ts";

/** German copy of the selection bar and Move to…; part of the German catalogue. */
export const deSelection = {
  "slideshow.edit": "Bearbeiten",
  "slideshow.moreActions": "Weitere Aktionen",
  "slideshow.moveTo": "Verschieben nach\u00a0…",
  "slideshow.moveStart": "Anfang",
  "slideshow.moveEnd": "Ende",
  "slideshow.moveBefore": "Vor Bild\u00a0…",
  "slideshow.moveConfirm": "Verschieben",
  "slideshow.moveNumberLower": "Kleinere Bildnummer",
  "slideshow.moveNumberHigher": "Größere Bildnummer",
} as const satisfies Record<string, Message>;
