/** A box in picture coordinates: 0..1 from the top left, inside the picture. */
export interface FocusBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** What found a subject: a face (pico, ADR-0012), an object (YOLOX-nano, ADR-0036) or Immich's faces. */
export const SUBJECT_FINDERS = ["face", "object", "immich-faces"] as const;
export type SubjectFinder = (typeof SUBJECT_FINDERS)[number];

/**
 * What the detection found in a picture: the box around its people or subject,
 * scenery (a wide view with no one thing to aim at), or nothing to aim at.
 */
export type PictureFocus =
  | { readonly kind: "subject"; readonly box: FocusBox; readonly foundBy: SubjectFinder }
  | { readonly kind: "scenery" }
  | { readonly kind: "none" };

/**
 * A picture's focus with the version of the detection that found it, stored by picture id
 * (device: beside its media; server: by Immich asset id); none yet: not looked at. A version
 * below `FOCUS_DETECTOR_VERSION` is outdated and looked at again (ADR-0041).
 */
export interface StoredFocus {
  readonly focus: PictureFocus;
  readonly detector: number;
}
