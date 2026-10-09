/** A box in picture coordinates: 0..1 from the top left, inside the picture. */
export interface FocusBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * What the on-device detection found in a picture: the box around its people or subject, or
 * nothing to aim at. Stored by picture id beside its media; none yet: not looked at (ADR-0012).
 */
export type PictureFocus =
  { readonly kind: "subject"; readonly box: FocusBox } | { readonly kind: "none" };
