/**
 * What share.html and its script agree on (dev-docs/share_link/RECIPIENTS_PAGE.md); the
 * script imports only this, never the page builder.
 */

/** `<script type="application/json">` holding `SharePageLanguages`. */
export const SHARE_WORDS_BLOCK_ID = "share-words";

const SHARE_PATH = /^\/s\/([^/]+)\/?$/;

/** The token of a share link's path, `/s/<token>`; null for any other path. */
export function shareToken(pathname: string): string | null {
  return SHARE_PATH.exec(pathname)?.[1] ?? null;
}
