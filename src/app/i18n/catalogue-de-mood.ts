import type { Message } from "./messages.ts";

/** German copy of the slideshow's mood (ADR-0045); part of the German catalogue. */
export const deMood = {
  "mood.resetDone": "Stimmung wieder automatisch",
  "mood.nowCustom": "Stimmung ist jetzt automatisch",
  "mood.title": "Stimmung",
  "mood.calm": "Ruhig",
  "mood.lively": "Lebhaft",
  "mood.custom": "Automatisch",
  "mood.byMood": "nach Stimmung",
  "mood.pictureTimesWithBeats": "~{seconds} · {beats} Beats",
  "mood.pictureTimesNoBeat": "~{seconds}",
  "mood.kenBurnsGentle": "Sanft",
  "mood.kenBurnsStrong": "Kräftig",
  "mood.motionGentle": "sanfte Bewegung",
  "mood.motionStrong": "kräftige Bewegung",
  "mood.motionStandard": "übliche Bewegung",
  "mood.followsTheEnergy": "folgt der Energie",
  "mood.pictureTimesRange": "{from} – {to}",
  "mood.transitionStandard": "Automatisch",
  "mood.transitionLong": "{name}, lang",
  "mood.transitionShort": "{name}, kurz",
  "mood.transitionMixedName": "Gemischt",
  "mood.whatItSets": "Was sie festlegt",
  "mood.calmSubtitle": "Langsam, sanft",
  "mood.livelySubtitle": "Schnell, auf dem Beat",
  "mood.customSubtitle": "Ihre Einstellungen",
  "mood.hintMood":
    "Die Bilddauer folgt dem Beat des Songs. Bilder mit eigener Dauer, eigenem Übergang oder eigener Bewegung behalten sie.",
  "mood.hintCustom": "Bilddauer, Übergänge und Bewegung, wie an der Diashow eingestellt.",
  "mood.backToCustom": "Zurück auf Automatisch",
  "mood.alreadyCustom": "Die Stimmung ist schon automatisch",
  "mood.sound": "Ton",
  "mood.energySwitch": "Folgt der Energie der Musik",
  "mood.energySwitchSubtitle":
    "Langsamer, wenn es leise ist, schneller, wenn es laut ist, ein starker Wechsel bei einem Drop",
  "mood.energyPictureTimesRange": "{from} – {to} · nach Energie",
  "mood.energyLiftLabel": "Wenn die Musik Fahrt aufnimmt",
  "mood.energyLiftValue": "Schnitt auf den Beat",
  "mood.hintMoodEnergy":
    "Die Stimmung bestimmt das durchschnittliche Tempo; die Energie macht es in leisen Passagen langsamer und in lauten schneller. Bilder mit eigener Dauer, eigenem Übergang oder eigener Bewegung behalten sie.",
  "mood.hintCustomEnergy":
    "Ihre Bilddauer bleibt der Durchschnitt. Mit „Musik füllen“ endet die Diashow weiterhin mit dem Song. Bilder mit eigener Dauer behalten sie.",
  "mood.energyStripQuiet": "leise → länger",
  "mood.energyStripLoud": "laut → schneller",
} as const satisfies Record<string, Message>;
