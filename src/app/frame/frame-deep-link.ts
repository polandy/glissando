/**
 * `#frame=<albumId>` starts a picture frame straight away (`dev-docs/app/FRAME.md`): read once at
 * startup from an injected location, before the navigator exists.
 */
const FRAME_HASH_PREFIX = "frame=";

/** The album id a frame deep link names, or null for any other hash (including an empty one). */
export function parseFrameDeepLink(hash: string): string | null {
  const withoutHash = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!withoutHash.startsWith(FRAME_HASH_PREFIX)) {
    return null;
  }
  const encoded = withoutHash.slice(FRAME_HASH_PREFIX.length);
  return encoded === "" ? null : decodeURIComponent(encoded);
}

/** The link "Copy frame link" puts on the clipboard. */
export function frameDeepLinkUrl(origin: string, pathname: string, albumId: string): string {
  return `${origin}${pathname}#${FRAME_HASH_PREFIX}${encodeURIComponent(albumId)}`;
}
