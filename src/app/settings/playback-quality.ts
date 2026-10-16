import type { KeyValueStorage } from "../start/first-launch.ts";
import { createStoredChoice, type StoredChoice } from "./stored-choice.ts";

/**
 * The rendition a server slideshow plays its pictures in (ADR-0027): Immich's preview, or the
 * original made into the display rendition on this device.
 */
export const PLAYBACK_QUALITIES = ["1440", "4k"] as const;
export type PlaybackQuality = (typeof PLAYBACK_QUALITIES)[number];

/** "auto" picks the quality by the screen; the others pin one. */
export const PLAYBACK_QUALITY_PREFERENCES = ["auto", ...PLAYBACK_QUALITIES] as const;
export type PlaybackQualityPreference = (typeof PLAYBACK_QUALITY_PREFERENCES)[number];

export const DEFAULT_PLAYBACK_QUALITY_PREFERENCE: PlaybackQualityPreference = "auto";

export const PLAYBACK_QUALITY_KEY = "glissando.playbackQuality";

/** The short edge of Immich's preview by default: a screen up to it shows the preview sharp. */
export const PREVIEW_SHORT_EDGE = 1440;

export type PlaybackQualityStore = StoredChoice<PlaybackQualityPreference>;

/** The screen as the browser tells it: CSS pixels and how many device pixels make one. */
export interface ScreenPixels {
  readonly width: number;
  readonly height: number;
  readonly devicePixelRatio: number;
}

export function createStoragePlaybackQualityStore(storage: KeyValueStorage): PlaybackQualityStore {
  return createStoredChoice(
    storage,
    PLAYBACK_QUALITY_KEY,
    PLAYBACK_QUALITY_PREFERENCES,
    DEFAULT_PLAYBACK_QUALITY_PREFERENCE,
  );
}

/** The screen's short edge in device pixels. */
export function screenShortEdge(screen: ScreenPixels): number {
  return Math.round(Math.min(screen.width, screen.height) * screen.devicePixelRatio);
}

/** The browser's screen's short edge in device pixels. */
export function browserScreenShortEdge(window: Window): number {
  const { width, height } = window.screen;
  return screenShortEdge({ width, height, devicePixelRatio: window.devicePixelRatio });
}

/** "auto" plays 4K only on a screen whose short edge has more pixels than the preview. */
export function effectivePlaybackQuality(
  preference: PlaybackQualityPreference,
  shortEdge: number,
): PlaybackQuality {
  if (preference !== "auto") return preference;
  return shortEdge > PREVIEW_SHORT_EDGE ? "4k" : "1440";
}
