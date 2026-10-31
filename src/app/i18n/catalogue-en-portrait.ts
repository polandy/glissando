import type { Catalogue } from "./messages.ts";
import type { dePortrait } from "./catalogue-de-portrait.ts";

/** English copy of the slideshow's portrait pictures setting and its picture editor toggle. */
export const enPortrait: Pick<Catalogue, keyof typeof dePortrait> = {
  "slideshow.portraitPictures": "Portrait pictures",
  "portrait.choice-automatic": "Automatic",
  "portrait.choice-one-at-a-time": "One at a time",
  "portrait.choice-fill-screen": "Fill the screen",
  "portrait.pairCount": { one: "{count} pair", other: "{count} pairs" },
  "portrait.default": "Automatic",
  "portrait.ownChoice": "Chosen",
  "portrait.title": "Portrait pictures",
  "portrait.hintAutomatic":
    "Two portrait pictures sit side by side; a single one that would lose a lot to the crop gets a blurred fill.",
  "portrait.hintOneAtATime":
    "Every picture is shown alone; one that would lose a lot to the crop gets a blurred fill.",
  "portrait.hintFillScreen":
    "Every picture fills the screen, even where that crops a head or feet.",
  "portrait.note": "Pictures with their own settings are always shown alone.",
  "portrait.reset": "Back to automatic",
  "portrait.alreadyAutomatic": "Portrait pictures are already set to automatic",
  "portrait.resetDone": "Portrait pictures back to automatic",
  "slideshow.pairedWith": ", shown as a pair with picture {number}",
  "slideshow.blurredFillBadge": "Blurred fill",
  "slideshow.aloneBadge": "Shown alone",
  "slideshow.pictureLabelAlone": ", shown alone",
  "slideshow.pictureLabelBlurredFill": ", over a blurred fill",
  "editor.layoutTitle": "Layout",
  "editor.alwaysAlone": "Always alone",
  "editor.alwaysAloneHint": "This picture never shares a slide with another one.",
  "editor.layoutPaired": "Shares a slide with picture {number}",
  "editor.layoutBlurredFill": "Shown alone over a blurred copy of itself on a wide screen.",
  "editor.layoutAlone": "Shown alone.",
  "editor.layoutSettingOverrides":
    'Has no effect while the slideshow is set to "{setting}" — there, every picture is shown alone.',
};
