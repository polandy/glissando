/**
 * A slideshow's look (ADR-0044, `dev-docs/player/LOOKS.md`): grades every picture and video
 * layer the same way in every renderer. "None" is the identity and carries no grade.
 */
export const SLIDESHOW_LOOKS = [
  "none",
  "warm",
  "cool",
  "vivid",
  "film",
  "black-and-white",
  "faded",
] as const;
export type SlideshowLook = (typeof SLIDESHOW_LOOKS)[number];

export const DEFAULT_SLIDESHOW_LOOK = "none" as const;

/** A look other than the identity: what `LOOK_GRADES` has an entry for, and what the player
 * JSON's `look` field accepts (ADR-0044) — "none" is absent, never written. */
export type GradedSlideshowLook = Exclude<SlideshowLook, typeof DEFAULT_SLIDESHOW_LOOK>;

/** Every look but the identity, in the sheet's order. */
export const GRADED_SLIDESHOW_LOOKS: readonly GradedSlideshowLook[] = SLIDESHOW_LOOKS.filter(
  (look): look is GradedSlideshowLook => look !== DEFAULT_SLIDESHOW_LOOK,
);

/** True for a look a renderer must actually grade for; false only for "none". */
export function isGradedLook(look: SlideshowLook): look is GradedSlideshowLook {
  return look !== DEFAULT_SLIDESHOW_LOOK;
}
