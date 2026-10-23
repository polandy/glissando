import { EVEN_PICTURE_CHANGES } from "../library/own-music";
import {
  ALTERNATE_TRANSITION,
  DEFAULT_SLIDESHOW_TRANSITION,
  type SlideshowTransition,
} from "../library/own-timing";
import type { SlideshowMood } from "../library/slideshow-mood";
import { MAX_SECONDS_PER_PICTURE, MIN_SECONDS_PER_PICTURE } from "../library/stored-slideshow";
import type { Playlist, SongBeats } from "./playlist";

/**
 * How each mood paces and shapes a slideshow (ADR-0045, `dev-docs/app/slideshow-editing/MOOD.md`):
 * a seconds-per-picture target to resolve against the music's tempo, a default transition and its
 * length, and the Ken Burns strength.
 */
export interface MoodProfile {
  /** Seconds per picture without a tempo, and what the beat step rounds towards with one. */
  readonly targetSeconds: number;
  /** How many beats one step of the picture length spans; 4 is a phrase. */
  readonly beatStep: number;
  readonly transition: SlideshowTransition;
  /** Share of the slide's length, in place of `TRANSITION_SHARE_OF_SLIDE`. */
  readonly transitionShare: number;
  /** In whole ms, in place of `MAX_TRANSITION_DURATION_MS`. */
  readonly maxTransitionMs: number;
  /** Scales the automatic Ken Burns motion; 1 is today's unscaled strength. */
  readonly kenBurnsStrength: number;
}

export const MOOD_PROFILES: Readonly<Record<SlideshowMood, MoodProfile>> = {
  calm: {
    targetSeconds: 7,
    beatStep: 4,
    transition: DEFAULT_SLIDESHOW_TRANSITION,
    transitionShare: 0.45,
    maxTransitionMs: 1600,
    kenBurnsStrength: 0.5,
  },
  lively: {
    targetSeconds: 3,
    beatStep: 2,
    transition: ALTERNATE_TRANSITION,
    transitionShare: 0.15,
    maxTransitionMs: 500,
    kenBurnsStrength: 1.4,
  },
};

/** A mood's profile resolved against a tempo: the seconds per picture, the rest unchanged. */
export interface MoodSettings extends MoodProfile {
  readonly secondsPerPicture: number;
}

const SECONDS_PER_MINUTE = 60;

/**
 * `mood`'s settings at `beatsPerMinute`: the seconds per picture rounded to the nearest whole
 * number of the mood's beat step towards its target, clamped to `MIN/MAX_SECONDS_PER_PICTURE`;
 * without a tempo, the target seconds as they are.
 */
export function moodSettings(
  mood: SlideshowMood,
  beatsPerMinute: number | undefined,
): MoodSettings {
  const profile = MOOD_PROFILES[mood];
  if (beatsPerMinute === undefined) {
    return { ...profile, secondsPerPicture: profile.targetSeconds };
  }
  const stepSeconds = (profile.beatStep * SECONDS_PER_MINUTE) / beatsPerMinute;
  const steps = Math.max(1, Math.round(profile.targetSeconds / stepSeconds));
  const secondsPerPicture = clamp(
    steps * stepSeconds,
    MIN_SECONDS_PER_PICTURE,
    MAX_SECONDS_PER_PICTURE,
  );
  return { ...profile, secondsPerPicture };
}

/**
 * The tempo a mood paces to: the `beatsPerMinute` of the first song in play order with a clear
 * beat that was not opted out of it with even picture changes (ADR-0045); absent if none.
 */
export function moodTempo(playlist: Pick<Playlist, "songs">, beats: SongBeats): number | undefined {
  for (const song of playlist.songs) {
    if (song.pictureChanges === EVEN_PICTURE_CHANGES) continue;
    const songBeats = beats.get(song.id);
    if (songBeats?.kind === "beats") {
      return songBeats.beatsPerMinute;
    }
  }
  return undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
