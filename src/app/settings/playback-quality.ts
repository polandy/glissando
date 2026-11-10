import { DISPLAY_BOUND } from "../../import/downscale.ts";
import type { KeyValueStorage } from "../storage/storage-port.ts";
import { createStoredChoice, type StoredChoice } from "./stored-choice.ts";

/**
 * The rendition a server slideshow plays its pictures in (ADR-0027): Immich's preview, or the
 * original made into the display rendition on this device.
 */
const PLAYBACK_QUALITIES = ["1440", "4k"] as const;
export type PlaybackQuality = (typeof PLAYBACK_QUALITIES)[number];

/** "auto" picks the quality by the screen; the others pin one. */
const PLAYBACK_QUALITY_PREFERENCES = ["auto", ...PLAYBACK_QUALITIES] as const;
export type PlaybackQualityPreference = (typeof PLAYBACK_QUALITY_PREFERENCES)[number];

const DEFAULT_PLAYBACK_QUALITY_PREFERENCE: PlaybackQualityPreference = "auto";

const PLAYBACK_QUALITY_KEY = "glissando.playbackQuality";

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

/**
 * "auto" plays 4K only on a screen whose short edge holds the whole 4K rendition: below it, the
 * gain over the preview does not pay for decoding each original during playback (ADR-0027).
 */
export function effectivePlaybackQuality(
  preference: PlaybackQualityPreference,
  shortEdge: number,
): PlaybackQuality {
  if (preference !== "auto") return preference;
  return shortEdge >= DISPLAY_BOUND.shortEdge ? "4k" : "1440";
}
