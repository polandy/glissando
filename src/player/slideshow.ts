/**
 * The slideshow as JSON: the contract shared by player, app and the optional server. Slides
 * play in array order, which starts as capture order and follows the user's reordering.
 */

export const SLIDESHOW_FORMAT_VERSION = 1;

/** Durations in the format are milliseconds; the player's clock speaks seconds. */
export const MILLISECONDS_PER_SECOND = 1000;

export const EASINGS = ["linear", "ease-in", "ease-out", "ease-in-out"] as const;
export type Easing = (typeof EASINGS)[number];

export const TRANSITION_EFFECTS = [
  "crossfade",
  "push-left",
  "wipe-right",
  "circle-open",
  "zoom-in",
  "dissolve",
] as const;
export type TransitionEffect = (typeof TRANSITION_EFFECTS)[number];

/** Smallest zoom: the picture exactly covers the viewport (crop-to-fit). */
export const MIN_KEN_BURNS_ZOOM = 1;

/**
 * Where the camera looks: `zoom` relative to crop-to-fit, the centre in picture coordinates
 * (0..1, origin top left). Independent of the viewport's aspect ratio.
 */
export interface Framing {
  readonly zoom: number;
  readonly centerX: number;
  readonly centerY: number;
}

export interface KenBurns {
  readonly from: Framing;
  readonly to: Framing;
  readonly easing: Easing;
}

/** Runs during the last `durationMs` of the slide that carries it. */
export interface Transition {
  readonly effect: TransitionEffect;
  readonly durationMs: number;
}

export interface Slide {
  readonly image: { readonly src: string; readonly capturedAt: string };
  readonly durationMs: number;
  readonly kenBurns: KenBurns;
  /** Shown bottom left with the slide; absent: none. Rules in `caption.ts`, see ADR-0007. */
  readonly caption?: string;
  /** Absent: a hard cut. Never on the last slide. */
  readonly transitionToNext?: Transition;
}

export interface Music {
  readonly src: string;
}

export interface Slideshow {
  readonly formatVersion: typeof SLIDESHOW_FORMAT_VERSION;
  readonly title: string;
  readonly music?: Music;
  readonly slides: readonly Slide[];
}
