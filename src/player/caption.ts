/**
 * A slide's caption: one line of text shown with the picture. The same rules hold in the
 * library, the `.glissando` file and the slideshow JSON.
 */

/** Counted in code points, so an emoji is one character as the user sees it. */
export const MAX_CAPTION_LENGTH = 80;

/** What a stored or parsed caption must be; error messages name it as the fix. */
export const CAPTION_RULE = `a single-line string of 1 to ${MAX_CAPTION_LENGTH} characters without leading, trailing or repeated whitespace`;

const WHITESPACE_RUN = /\s+/g;

export function captionLength(text: string): number {
  return [...text].length;
}

/**
 * The caption as stored: whitespace runs (newlines and tabs too) become one space, the ends are
 * trimmed and at most `MAX_CAPTION_LENGTH` characters stay. Nothing left means no caption.
 */
export function normalizeCaption(typed: string): string | undefined {
  const collapsed = typed.replace(WHITESPACE_RUN, " ").trim();
  const normal = [...collapsed].slice(0, MAX_CAPTION_LENGTH).join("").trimEnd();
  return normal === "" ? undefined : normal;
}

/** True for a caption exactly as `normalizeCaption` leaves it. */
export function isCaption(value: unknown): value is string {
  return typeof value === "string" && value !== "" && normalizeCaption(value) === value;
}
