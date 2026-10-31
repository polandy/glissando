import type { Catalogue } from "./messages.ts";
import type { deMood } from "./catalogue-de-mood.ts";

/** English copy of the slideshow's mood; typed to the German keys. */
export const enMood: Pick<Catalogue, keyof typeof deMood> = {
  "mood.resetDone": "Mood back to automatic",
  "mood.nowCustom": "Mood is now automatic",
  "mood.title": "Mood",
  "mood.calm": "Calm",
  "mood.lively": "Lively",
  "mood.custom": "Automatic",
  "mood.byMood": "by mood",
  "mood.pictureTimesWithBeats": "~{seconds} · {beats} beats",
  "mood.pictureTimesNoBeat": "~{seconds}",
  "mood.kenBurnsGentle": "Gentle",
  "mood.kenBurnsStrong": "Strong",
  "mood.motionGentle": "gentle motion",
  "mood.motionStrong": "strong motion",
  "mood.motionStandard": "standard motion",
  "mood.followsTheEnergy": "follows the energy",
  "mood.pictureTimesRange": "{from} – {to}",
  "mood.transitionStandard": "automatic",
  "mood.transitionLong": "{name}, long",
  "mood.transitionShort": "{name}, short",
  "mood.transitionMixedName": "Mixed",
  "mood.whatItSets": "What it sets",
  "mood.calmSubtitle": "Slow, soft",
  "mood.livelySubtitle": "Quick, on the beat",
  "mood.customSubtitle": "Your settings",
  "mood.hintMood":
    "Picture length follows the song's beat. Pictures with their own duration, transition or motion keep them.",
  "mood.hintCustom": "Your picture length, transitions and motion, as set on the slideshow.",
  "mood.backToCustom": "Back to automatic",
  "mood.alreadyCustom": "The mood is already automatic",
  "mood.sound": "Sound",
  "mood.energySwitch": "Follow the music's energy",
  "mood.energySwitchSubtitle":
    "Slower when it's quiet, quicker when it's loud, a strong change at a drop",
  "mood.energyPictureTimesRange": "{from} – {to} · by energy",
  "mood.energyLiftLabel": "When the music picks up",
  "mood.energyLiftValue": "Cut on the beat",
  "mood.hintMoodEnergy":
    "The mood sets the average pace; the energy makes it slower in quiet passages and quicker in loud ones. Pictures with their own duration, transition or motion keep them.",
  "mood.hintCustomEnergy":
    "Your picture length stays the average. With “Fill the music” the slideshow still ends with the song. Pictures with their own duration keep it.",
  "mood.energyStripQuiet": "quiet → longer",
  "mood.energyStripLoud": "loud → quicker",
};
