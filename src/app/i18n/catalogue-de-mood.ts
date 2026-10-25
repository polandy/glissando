import type { Message } from "./messages.ts";

/** German copy of the slideshow's mood (ADR-0045); part of the German catalogue. */
export const deMood = {
  "mood.resetDone": "Stimmung wieder auf Eigene",
  "mood.nowCustom": "Stimmung ist jetzt Eigene",
  "mood.title": "Stimmung",
  "mood.calm": "Ruhig",
  "mood.lively": "Lebhaft",
  "mood.custom": "Eigene",
  "slideshow.moodDefault": "Vorgabe",
  "mood.byMood": "nach Stimmung",
  "mood.pictureTimesWithBeats": "~{seconds} · {beats} Beats",
  "mood.pictureTimesNoBeat": "~{seconds}",
  "mood.kenBurnsGentle": "Sanft",
  "mood.kenBurnsStrong": "Kräftig",
  "mood.transitionStandard": "Standard",
  "mood.transitionLong": "{name}, lang",
  "mood.transitionShort": "{name}, kurz",
  "mood.transitionMixedName": "Gemischt",
  "mood.whatItSets": "Was sie festlegt",
  "mood.calmSubtitle": "Langsam, sanft",
  "mood.livelySubtitle": "Schnell, auf dem Beat",
  "mood.customSubtitle": "Ihre Einstellungen",
  "mood.hintMood":
    "Die Bilddauer folgt den Beats und Phrasen des Songs. Bilder mit eigener Dauer, eigenem Übergang oder eigener Bewegung behalten sie.",
  "mood.hintCustom":
    "Ihre eigene Bilddauer, Übergänge und Ken Burns, wie an der Diashow eingestellt.",
  "mood.backToCustom": "Zurück auf Eigene",
  "mood.alreadyCustom": "Die Diashow steht schon auf Eigene",
  "mood.previewBpm": "♪ {bpm} BPM",
  "mood.previewPending": "♪ …",
  "mood.previewNoBeat": "♪ kein Beat gefunden",
  "mood.sound": "Ton",
  "mood.energySwitch": "Folgt der Energie der Musik",
  "mood.energySwitchSubtitle":
    "Langsamer, wenn es leise ist, schneller, wenn es laut ist, ein starker Wechsel bei einem Drop",
  "mood.energySwitchPanelSubtitle": "Langsamer, wenn es leise ist, schneller, wenn es laut ist",
  "mood.energyPictureTimesRange": "{from} – {to} · nach Energie",
  "mood.energyLiftLabel": "Bei einem Drop oder Refrain",
  "mood.energyLiftValue": "Schnitt auf den Beat",
  "mood.hintMoodEnergy":
    "Die Stimmung bestimmt das durchschnittliche Tempo; die Energie macht es in leisen Passagen langsamer und in lauten schneller. Bilder mit eigener Dauer, eigenem Übergang oder eigener Bewegung behalten sie.",
  "mood.hintCustomEnergy":
    "Ihre Bilddauer bleibt der Durchschnitt. Mit „Musik füllen“ endet die Diashow weiterhin mit dem Song. Bilder mit eigener Dauer behalten sie.",
  "mood.energyBadgeSuffix": "Energie",
  "mood.energyStripQuiet": "leise → länger",
  "mood.energyStripLoud": "laut → schneller",
} as const satisfies Record<string, Message>;
