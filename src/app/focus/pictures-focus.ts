import type { FocusPassState } from "../../library/focus-pass";
import type { PictureFocus } from "../../library/picture-focus";

/** What is known of the pictures' focus: as stored when a slideshow was opened, and found since. */
export interface PicturesFocus {
  /** By picture id; a picture absent has not been looked at. */
  readonly found: ReadonlyMap<string, PictureFocus>;
  /** The pictures the background pass will still look at. */
  readonly searching: ReadonlySet<string>;
}

/** Before the stored focus is read: nothing known, the automatic motion aims at the middle. */
export const NO_FOCUS_KNOWN: PicturesFocus = { found: new Map(), searching: new Set() };

/**
 * What the picture editor shows of one picture's focus: the subject box or none, being searched
 * for, or not looked at (its detection failed; the next pass tries again).
 */
export type PictureFocusStatus =
  PictureFocus | { readonly kind: "searching" } | { readonly kind: "not-looked-at" };

/** The pass stores before it publishes, so what it found since is never older than `stored`. */
export function picturesFocus(
  stored: ReadonlyMap<string, PictureFocus>,
  pass: FocusPassState,
): PicturesFocus {
  return { found: new Map([...stored, ...pass.found]), searching: pass.searching };
}

export function focusStatus(focus: PicturesFocus, pictureId: string): PictureFocusStatus {
  const found = focus.found.get(pictureId);
  if (found !== undefined) {
    return found;
  }
  return focus.searching.has(pictureId) ? { kind: "searching" } : { kind: "not-looked-at" };
}
