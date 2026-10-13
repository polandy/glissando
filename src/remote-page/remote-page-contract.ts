/**
 * What remote.html and its script agree on (dev-docs/tv_remote/REMOTE_PAGE.md); the script
 * imports only this, never the page builder.
 */

/** `<script type="application/json">` holding `RemotePageLanguages`. */
export const REMOTE_WORDS_BLOCK_ID = "remote-words";

/** `/r/<remoteSecret>`: 22 base64url characters (dev-docs/tv_remote/SESSIONS.md). */
const REMOTE_PATH = /^\/r\/([A-Za-z0-9_-]{22})\/?$/;

/** The remote's secret from its page's path; null for any other path. */
export function remoteSecret(pathname: string): string | null {
  return REMOTE_PATH.exec(pathname)?.[1] ?? null;
}
