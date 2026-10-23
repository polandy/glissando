import type { Message } from "./messages.ts";

/** German copy of the slideshow's colour grade (ADR-0044); part of the German catalogue. */
export const deLook = {
  "slideshow.lookDefault": "Vorgabe",
  "look.title": "Look",
  "look.none": "Ohne",
  "look.warm": "Warm",
  "look.cool": "Kühl",
  "look.vivid": "Kräftig",
  "look.film": "Film",
  "look.black-and-white": "Schwarzweiß",
  "look.faded": "Verblasst",
  "look.defaultTag": "Standard",
  "look.hint":
    "Gilt für jedes Bild und Video dieser Diashow, auch im exportierten Video und in der Webseite. Titel- und Schlussbilder und Bildunterschriften bleiben wie sie sind.",
  "look.reset": "Look entfernen",
  "look.alreadyNone": "Die Diashow hat keinen Look",
  "look.holdToCompare": "Halten zum Vergleichen",
  "look.original": "Original",
  "look.resetDone": "Look entfernt",
} as const satisfies Record<string, Message>;
