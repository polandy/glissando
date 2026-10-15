/**
 * The slideshow as JSON: the contract shared by player, app and the optional server. Slides
 * play in array order, which starts as capture order and follows the user's reordering.
 */

/**
 * Version 3: the music is a playlist of tracks, each placed in the slideshow (ADR-0023). Version
 * 4 added a slide's `partner`, a second picture drawn beside or below the first, and `fit`,
 * which turns the blurred fill off for the slide (ADR-0028). Version 5 added the title card
 * (ADR-0032): a slide's `card`, a ground slide in place of a picture, and the show's `endFadeMs`.
 * Version 6 makes a card's `entrance` required. Version 7 added a picture slide's `video`
 * (ADR-0034, `dev-docs/player/VIDEO_SLIDES.md`).
 */
export const SLIDESHOW_FORMAT_VERSION = 7;

/** A video slide's excerpt is 0.5 s to 5 min long. */
export const MIN_VIDEO_EXCERPT_MS = 500;
export const MAX_VIDEO_EXCERPT_MS = 300_000;

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

/** The card's typographic treatment; the look of each lives in `card-layout.ts`. */
export const CARD_STYLES = ["modern", "quiet", "bold", "classic"] as const;
export type CardStyle = (typeof CARD_STYLES)[number];

/** Where the card's text block sits; see `card-layout.ts` for the exact placement. */
export const CARD_POSITIONS = ["centre", "bottom-left"] as const;
export type CardPosition = (typeof CARD_POSITIONS)[number];

/** The card's text colour; the composer picks it for contrast, the player does not guess. */
export const CARD_INKS = ["light", "dark"] as const;
export type CardInk = (typeof CARD_INKS)[number];

/** How the card's text comes in and goes out; see `card-items.ts` and `card-timing.ts`. */
export const CARD_ENTRANCES = ["rise", "words", "letters", "focus", "slow-fade"] as const;
export type CardEntrance = (typeof CARD_ENTRANCES)[number];

/**
 * The title or closing text the player draws over a slide (ADR-0032). Timing lives with
 * `card-timing.ts`, look with `card-layout.ts`; see `dev-docs/player/TITLE_CARDS.md`.
 */
export interface Card {
  readonly title: string;
  readonly subtitle?: string;
  readonly style: CardStyle;
  readonly position: CardPosition;
  readonly ink: CardInk;
  readonly entrance: CardEntrance;
  /** Darkens and desaturates the picture behind the card; picture slides only. */
  readonly veil?: { readonly amount: number; readonly tint: string };
  /** Where the card starts, in slide time; default 0. */
  readonly enterAtMs?: number;
  /** Where the text dissolves and the veil lifts, in slide time; picture slides only. */
  readonly revealAtMs?: number;
}

/**
 * The clip a video slide plays over its poster (`image`): `startMs` and `endMs` are ms of the
 * clip, and the slide's `durationMs` is `endMs − startMs`. `volume` is 0..1; the music ducks
 * while a clip with sound plays unless `duckMusic` is `false`.
 */
export interface SlideVideo {
  readonly src: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly volume: number;
  readonly duckMusic?: boolean;
}

/** A slide with a picture, as every slide was before version 5. */
export interface PictureSlide {
  readonly image: { readonly src: string; readonly capturedAt: string };
  readonly durationMs: number;
  readonly kenBurns: KenBurns;
  /**
   * The second picture of a composed portrait pair, drawn right of `image` on a landscape
   * screen and below it on a portrait one, each cropped to cover its half (ADR-0028).
   */
  readonly partner?: {
    readonly image: { readonly src: string; readonly capturedAt: string };
    readonly kenBurns: KenBurns;
  };
  /** A clip played in place of Ken Burns; `kenBurns` is then a still and `partner` is absent. */
  readonly video?: SlideVideo;
  /** Shown bottom left with the slide; absent: none. Rules in `caption.ts`, see ADR-0007. */
  readonly caption?: string;
  /** `"cover"` turns the blurred fill off; absent: whole picture over a blurred fill if needed. */
  readonly fit?: "cover";
  /** The slideshow's title or closing card, drawn over this picture (ADR-0032). */
  readonly card?: Card;
  /** Absent: a hard cut. Never on the last slide. */
  readonly transitionToNext?: Transition;
}

/** A slide with a solid colour instead of a picture, drawn behind a title or closing card. */
export interface GroundSlide {
  /** `#RRGGBB`. */
  readonly ground: string;
  readonly durationMs: number;
  readonly card: Card;
  /** Absent: a hard cut. Never on the last slide. */
  readonly transitionToNext?: Transition;
}

export type Slide = PictureSlide | GroundSlide;

/** True for a slide drawn over a solid colour rather than a picture. */
export function isGroundSlide(slide: Slide): slide is GroundSlide {
  return "ground" in slide;
}

/**
 * A track as it plays, resolved by the composer: `atMs` is slideshow time, the other times are
 * ms of the track. See ADR-0009 and ADR-0023.
 */
export interface MusicTrack {
  readonly src: string;
  /** Where in the slideshow the track starts. */
  readonly atMs: number;
  /** Where in the track playing starts. */
  readonly startMs: number;
  /** Where the track stops being heard. */
  readonly endMs: number;
  /** Ramps the volume up from `startMs`; 0: none. */
  readonly fadeInMs: number;
  /** Ramps the volume down to `endMs`; 0: none. */
  readonly fadeOutMs: number;
}

export interface Slideshow {
  readonly formatVersion: typeof SLIDESHOW_FORMAT_VERSION;
  readonly title: string;
  /** In order of `atMs`, never empty; at most two sound at once, in a crossfade. Absent: silence. */
  readonly music?: readonly MusicTrack[];
  readonly slides: readonly Slide[];
  /** Over the last `endFadeMs` of the show, the frame mixes to black (ADR-0032). Absent: none. */
  readonly endFadeMs?: number;
}
