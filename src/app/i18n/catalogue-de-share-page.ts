import type { Message } from "./messages.ts";

/**
 * German copy of the page a shared slideshow's link opens (dev-docs/SHARE_LINK.md), built into
 * that page with the export page's `htmlPage.*` words.
 */
export const deSharePage = {
  "sharePage.eyebrow": "Geteilte Diashow",
  "sharePage.madeWith": "Geteilt mit Glissando",
  "sharePage.loadingFirst": "Die ersten Bilder werden geladen …",
  "sharePage.loadingLate": "Lädt",
  "sharePage.goneTitle": "Dieser Link funktioniert nicht mehr",
  "sharePage.goneText":
    "Wer die Diashow geteilt hat, hat den Link ausgeschaltet. Frag nach einem neuen.",
  "sharePage.unreachableTitle": "Die Diashow ist gerade nicht erreichbar",
  "sharePage.unreachableText":
    "Der Server, auf dem sie liegt, antwortet nicht. Vielleicht startet er gerade neu; versuch es gleich noch einmal.",
  "sharePage.noscript":
    "Diese Diashow braucht JavaScript. Öffne den Link in einem Browser wie Safari, Chrome oder Firefox.",
} as const satisfies Record<string, Message>;
