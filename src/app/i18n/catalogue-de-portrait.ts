import type { Message } from "./messages.ts";

/** German copy of the slideshow's portrait pictures setting and its picture editor toggle. */
export const dePortrait = {
  "slideshow.portraitPictures": "Hochformatbilder",
  "portrait.choice-automatic": "Automatisch",
  "portrait.choice-one-at-a-time": "Einzeln",
  "portrait.choice-fill-screen": "Bildschirm füllen",
  "portrait.pairCount": { one: "{count} Paar", other: "{count} Paare" },
  "portrait.default": "Automatisch",
  "portrait.ownChoice": "Gewählt",
  "portrait.title": "Hochformatbilder",
  "portrait.hintAutomatic":
    "Zwei Hochformatbilder stehen nebeneinander; ein einzelnes, das der Zuschnitt stark beschneiden würde, bekommt eine unscharfe Füllung.",
  "portrait.hintOneAtATime": "Jedes Bild wird einzeln gezeigt; eines, das der Zuschnitt stark beschneiden würde, bekommt eine unscharfe Füllung.",
  "portrait.hintFillScreen":
    "Jedes Bild füllt den Bildschirm, auch wenn das Kopf oder Füße abschneidet.",
  "portrait.note": "Bilder mit eigenen Einstellungen werden immer einzeln gezeigt.",
  "portrait.reset": "Zurück auf Automatisch",
  "portrait.alreadyAutomatic": "Hochformatbilder stehen schon auf Automatisch",
  "portrait.resetDone": "Hochformatbilder wieder automatisch",
  "slideshow.pairedWith": ", gezeigt als Paar mit Bild {number}",
  "slideshow.blurredFillBadge": "Unscharfe Füllung",
  "slideshow.aloneBadge": "Allein gezeigt",
  "slideshow.pictureLabelAlone": ", allein gezeigt",
  "slideshow.pictureLabelBlurredFill": ", über einer unscharfen Füllung",
  "editor.layoutTitle": "Layout",
  "editor.alwaysAlone": "Immer allein",
  "editor.alwaysAloneHint": "Dieses Bild wird nie mit einem anderen auf einem Dia gezeigt.",
  "editor.layoutPaired": "Teilt ein Dia mit Bild {number}",
  "editor.layoutBlurredFill":
    "Wird allein über einer unscharfen Kopie von sich selbst gezeigt, auf einem breiten Bildschirm.",
  "editor.layoutAlone": "Wird allein gezeigt.",
  "editor.layoutSettingOverrides":
    "Wirkt sich nicht aus, solange die Diashow auf „{setting}“ steht – dort wird jedes Bild einzeln gezeigt.",
} as const satisfies Record<string, Message>;
