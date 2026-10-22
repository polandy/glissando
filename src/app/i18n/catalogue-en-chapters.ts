import type { Catalogue } from "./messages.ts";
import type { deChapters } from "./catalogue-de-chapters.ts";

/** English copy of trip chapters (TRIP_CHAPTERS.md): their strip tile, sheet and switch. */
export const enChapters: Pick<Catalogue, keyof typeof deChapters> = {
  "chapters.edited": "Edited",
  "chapters.sheetTitleAutomatic": "Chapter",
  "chapters.sheetTitleAdded": "Your chapter",
  "chapters.sheetTitleGeneral": "Trip chapters",
  "chapters.titleLabel": "Title",
  "chapters.subtitleLabel": "Subtitle",
  "chapters.titleAlreadyAutomatic": "The title is already automatic",
  "chapters.subtitleAlreadyAutomatic": "The subtitle is already automatic",
  "chapters.hideSwitch": "Hide this chapter",
  "chapters.hideHelper": "It will not show in the slideshow, but stays here.",
  "chapters.deleteChapter": "Delete chapter",
  "chapters.automaticSwitch": "Automatic chapters",
  "chapters.automaticHelperOn": "A short slide wherever the trip moves on to a new place.",
  "chapters.automaticHelperOff":
    "A short slide wherever the trip moves on to a new place. Chapters you added stay.",
  "chapters.automaticHelperDisabled": "Off while you arrange the order yourself",
  "chapters.insertChapter": "Insert chapter",
  "chapters.rowLabel": "Trip chapters",
  "chapters.count": {
    one: "{count} chapter",
    other: "{count} chapters",
  },
  "chapters.automaticOffSummary": "Automatic off",
};
