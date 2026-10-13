import type { Message } from "./messages.ts";

/**
 * German copy of the share page as the TV page (dev-docs/tv_remote/TV_PAGE.md), built into
 * that page with the share page's words.
 */
export const deTvPage = {
  "tvPage.pairTitle": "Hier eine Diashow zeigen",
  "tvPage.pairText":
    "Öffne auf dem Handy eine Diashow und tippe auf „Auf dem Fernseher zeigen“. Scanne den Code oder tippe ihn ein.",
  "tvPage.allowSound": "Ton erlauben",
  "tvPage.soundAllowed": "Ton ist erlaubt",
  "tvPage.connectedTitle": "Handy verbunden",
  "tvPage.connectedText": "Wähle auf dem Handy eine Diashow.",
  "tvPage.endedTitle": "Das war „{title}“",
  "tvPage.endedText": "Tippe auf dem Handy auf „Nochmal abspielen“ oder wähle eine andere Diashow.",
  "tvPage.unreachableTitle": "Der Server antwortet nicht",
  "tvPage.unreachableText":
    "Vielleicht startet er gerade neu. Diese Seite versucht es von selbst wieder.",
  "tvPage.controlWithPhone": "Mit dem Handy steuern",
  "tvPage.scanToControl": "Scanne den Code mit dem Handy, um die Diashow zu steuern.",
  "tvPage.qrCode": "QR-Code für das Handy",
  "tvPage.notePlaying": "Läuft",
  "tvPage.notePaused": "Pausiert",
  "tvPage.noteNext": "Weiter",
  "tvPage.notePrevious": "Zurück",
  "tvPage.noteVolume": "Lautstärke {percent} %",
} as const satisfies Record<string, Message>;
