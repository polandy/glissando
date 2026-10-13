import type { Catalogue } from "./messages.ts";
import type { dePortrait } from "./catalogue-de-portrait.ts";

/** English copy of the slideshow's portrait pictures setting and its picture editor toggle. */
export const enPortrait: Pick<Catalogue, keyof typeof dePortrait> = {
  "slideshow.portraitPictures": "Portrait pictures",
  "portrait.choice-automatic": "Automatic",
  "portrait.choice-one-at-a-time": "One at a time",
  "portrait.choice-fill-screen": "Fill the screen",
  "portrait.pairCount": { one: "{count} pair", other: "{count} pairs" },
  "portrait.default": "Default",
  "portrait.ownChoice": "Own choice",
  "portrait.title": "Portrait pictures",
  "portrait.hintAutomatic":
    "Two consecutive portrait pictures are shown side by side; a single one a wide screen would crop a lot gets a blurred fill instead.",
  "portrait.hintOneAtATime":
    "Every picture is shown alone; one a wide screen would crop a lot gets a blurred fill instead.",
  "portrait.hintFillScreen":
    "Every picture fills the screen as before, even where that crops off a head or feet.",
  "portrait.note":
    "Pictures with an own motion, duration, caption or transition, or set to always alone, are shown alone.",
  "portrait.reset": "Back to automatic",
  "portrait.alreadyAutomatic": "Portrait pictures are already set to automatic",
  "portrait.resetDone": "Portrait pictures back to automatic",
  "slideshow.pairedWith": ", shown as a pair with picture {number}",
  "slideshow.blurredFillBadge": "Blurred fill",
  "slideshow.aloneBadge": "Shown alone",
  "editor.layoutTitle": "Layout",
  "editor.alwaysAlone": "Always alone",
  "editor.alwaysAloneHint": "This picture never shares a slide with another one.",
  "editor.layoutPaired": "Shares a slide with picture {number}",
  "editor.layoutBlurredFill":
    "Shown alone over a blurred copy of itself on a wide screen.",
  "editor.layoutAlone": "Shown alone.",
  "editor.layoutSettingOverrides":
    "Has no effect while the slideshow is set to \"{setting}\" — there, every picture is shown alone.",
};
