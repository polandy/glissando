/**
 * A share link's token: a secret in a URL path (`dev-docs/SHARE_LINK.md`, The link). Its 128
 * random bits are unguessable, and the logs never carry it.
 */

export const SHARE_TOKEN_BYTES = 16;

/** `count` random bytes, from the operating system's source outside tests. */
export type RandomBytes = (count: number) => Uint8Array;

export function newShareToken(randomBytes: RandomBytes): string {
  const bytes = randomBytes(SHARE_TOKEN_BYTES);
  if (bytes.length !== SHARE_TOKEN_BYTES) {
    throw new Error(`the random source answered ${bytes.length} bytes, not ${SHARE_TOKEN_BYTES}`);
  }
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

const REDACTED = "…";
/** Every path whose first segment after the prefix is a token. */
const TOKEN_IN_PATH = /^(\/api\/share\/|\/s\/|\/internal\/share-picture\/)[^/]*/;

/** `path` with the share token it carries, if any, replaced by `…`. */
export function redactShareTokens(path: string): string {
  return path.replace(TOKEN_IN_PATH, `$1${REDACTED}`);
}
