import type { Message } from "./messages.ts";

/** German copy of trip chapters (TRIP_CHAPTERS.md): their strip tile, sheet and switch. */
export const deChapters = {
  "chapters.edited": "Bearbeitet",
  "chapters.sheetTitleAutomatic": "Kapitel",
  "chapters.sheetTitleAdded": "Eigenes Kapitel",
  "chapters.titleLabel": "Titel",
  "chapters.subtitleLabel": "Untertitel",
  "chapters.titleAlreadyAutomatic": "Der Titel ist schon automatisch",
  "chapters.subtitleAlreadyAutomatic": "Der Untertitel ist schon automatisch",
  "chapters.hideSwitch": "Dieses Kapitel ausblenden",
  "chapters.hideHelper": "Es erscheint nicht in der Diashow, bleibt aber erhalten.",
  "chapters.deleteChapter": "Kapitel löschen",
  "chapters.automaticHelperOn":
    "Ein kurzes Bild, wo immer die Reise an einen neuen Ort weitergeht.",
  "chapters.automaticHelperOff": "Nur Kapitel, die du hinzugefügt hast, werden gezeigt.",
  "chapters.automaticHelperDisabled": "Aus, solange du die Reihenfolge selbst bestimmst",
  "chapters.insertChapterBefore": "Kapitel davor einfügen",
  "chapters.insertChapterShort": "Kapitel",
  "chapters.rowLabel": "Reisekapitel",
  "chapters.deleted": "Kapitel gelöscht",
  "chapters.titleResetDone": "Kapiteltitel wieder automatisch",
  "chapters.subtitleResetDone": "Kapitel-Untertitel wieder automatisch",
} as const satisfies Record<string, Message>;
