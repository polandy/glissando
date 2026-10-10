import type { deAdd } from "./catalogue-de-add";
import type { Catalogue } from "./messages";

/** English copy of adding pictures to a slideshow and of duplicates; typed to the German keys. */
export const enAdd: Pick<Catalogue, keyof typeof deAdd> = {
  "add.title": "Add pictures",
  "add.titleShort": "Add",
  "add.leadByDate": "They go into place by capture date.",
  "add.leadOwnOrder": "They go at the end, in capture order; your own order stays.",
  "add.leadDownscale": "Glissando downscales them for this device; your originals stay untouched.",
  "add.afterTitle": "After adding",
  "add.afterPictures": "Pictures",
  "add.afterDuration": "Duration",
  "add.afterPerPicture": "Per picture",
  "add.beforeAfter": "{before} → {after}",
  "add.sharesMusic":
    "The pictures keep sharing the music; each gets a little shorter. Pictures with their own duration keep it.",
  "add.musicTooShort": "The music is too short for all pictures:",
  "add.musicTooShortText":
    "no picture shows for less than {seconds}, so the slideshow runs {total} and the music {music}.",
  "add.noMusic": "Each new picture gets {seconds}; the slideshow gets longer.",
  "add.add": { one: "Add {count}", other: "Add {count}" },
  "add.added": { one: "{count} picture added", other: "{count} pictures added" },
  "add.newBadge": "new",
  "add.newLabel": "{label}, new",
  "add.duplicatesInSlideshow": {
    one: "{count} picture is already in the slideshow and was skipped:",
    other: "{count} pictures are already in the slideshow and were skipped:",
  },
  "add.chosenTwice": {
    one: "{count} picture was chosen twice and was skipped:",
    other: "{count} pictures were chosen twice and were skipped:",
  },
  "add.addAnyway": "Add anyway",
};
