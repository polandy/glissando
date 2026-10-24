import type { Catalogue } from "./messages.ts";
import type { deMood } from "./catalogue-de-mood.ts";

/** English copy of the slideshow's mood; typed to the German keys. */
export const enMood: Pick<Catalogue, keyof typeof deMood> = {
  "mood.resetDone": "Mood back to Custom",
  "mood.nowCustom": "Mood is now Custom",
  "mood.title": "Mood",
  "mood.calm": "Calm",
  "mood.lively": "Lively",
  "mood.custom": "Custom",
  "slideshow.moodDefault": "default",
  "mood.byMood": "by mood",
  "mood.pictureTimesWithBeats": "~{seconds} · {beats} beats",
  "mood.pictureTimesNoBeat": "~{seconds}",
  "mood.kenBurnsGentle": "Gentle",
  "mood.kenBurnsStrong": "Strong",
  "mood.transitionStandard": "standard",
  "mood.transitionLong": "{name}, long",
  "mood.transitionShort": "{name}, short",
  "mood.transitionMixedName": "Mixed",
  "mood.whatItSets": "What it sets",
  "mood.calmSubtitle": "Slow, soft",
  "mood.livelySubtitle": "Quick, on the beat",
  "mood.customSubtitle": "Your settings",
  "mood.hintMood":
    "Picture times follow the song's beats and phrases. Pictures with their own duration, transition or motion keep them.",
  "mood.hintCustom": "Your own picture times, transitions and Ken Burns, as set on the slideshow.",
  "mood.backToCustom": "Back to Custom",
  "mood.alreadyCustom": "The slideshow is already Custom",
  "mood.previewBpm": "♪ {bpm} BPM",
  "mood.previewPending": "♪ …",
  "mood.previewNoBeat": "♪ no beat found",
  "mood.sound": "Sound",
  "mood.energySwitch": "Follow the music's energy",
  "mood.energySwitchSubtitle":
    "Slower when it's quiet, quicker when it's loud, a strong change at a drop",
  "mood.energyPictureTimesRange": "{from} – {to} · by energy",
  "mood.energyLiftLabel": "At a drop or chorus",
  "mood.energyLiftValue": "Cut on the beat",
  "mood.hintMoodEnergy":
    "The mood sets the average pace; the energy makes it slower in quiet passages and quicker in loud ones. Pictures with their own duration, transition or motion keep them.",
  "mood.hintCustomEnergy":
    "Your picture times stay the average. With “Fill the music” the slideshow still ends with the song. Pictures with their own duration keep it.",
  "mood.energyBadgeSuffix": "energy",
  "mood.energyStripQuiet": "quiet → longer",
  "mood.energyStripLoud": "loud → quicker",
  "mood.energyFollowsNote": "follows the energy",
};
