import type { Message } from "./messages.ts";

/** German copy of the full-screen picture viewer in the pictures step. */
export const deView = {
  "view.open": "Bild vom {date} um {time} ansehen",
  "view.label": "Bild vom {date}",
  "view.position": "{position} von {count}",
  "view.setAside": "Beiseitegelegt: {reason}",
  "view.previous": "Vorheriges Bild",
  "view.next": "Nächstes Bild",
  "view.takeIn": "Übernehmen",
  "view.pictures": "Alle Bilder",
  "view.showPicture": "Bild {position} zeigen",
} as const satisfies Record<string, Message>;
