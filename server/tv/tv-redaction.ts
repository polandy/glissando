/**
 * A TV's key and a remote's secret are credentials in a URL path (dev-docs/tv_remote/SESSIONS.md):
 * the logs carry neither, as they carry no share token.
 */

const REDACTED = "…";
/** Paths whose first segment after the prefix, in any case, is always a key or a secret. */
const SECRET_IN_PATH = /^(\/api\/tv\/remote\/|\/r\/|\/internal\/tv-picture\/)[^/]*/i;
/** Under `/api/tv/`, every first segment but the two route names is a TV's key. */
const TV_KEY_IN_PATH = /^(\/api\/tv\/)(?!(?:sessions|remote)(?:\/|$))[^/]*/i;
/** Under `/api/library/tv/`, every first segment but the claim is a remote's secret. */
const LIBRARY_SECRET_IN_PATH = /^(\/api\/library\/tv\/)(?!claim$)[^/]*/i;

/** `path` with the TV key or remote secret it carries, if any, replaced by `…`. */
export function redactTvSecrets(path: string): string {
  return path
    .replace(SECRET_IN_PATH, `$1${REDACTED}`)
    .replace(TV_KEY_IN_PATH, `$1${REDACTED}`)
    .replace(LIBRARY_SECRET_IN_PATH, `$1${REDACTED}`);
}
