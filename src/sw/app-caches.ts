const APP_CACHE = "glissando-app";
const VERSIONS_CACHE = "glissando-versions";
// encodeURIComponent always escapes it, so no encoded scope contains it and one scope's names
// never start like another's.
const SEPARATOR = "|";
/** The current version and the one before it, for a tab still running that one (ADR-0005). */
const KEPT_VERSIONS = 2;

// Cache names are shared by the whole origin: the scope keeps installs below different paths
// of one host apart.
function appCachePrefix(scope: string): string {
  return `${APP_CACHE}${SEPARATOR}${encodeURIComponent(scope)}${SEPARATOR}`;
}

export function cacheNameFor(scope: string, version: string): string {
  return `${appCachePrefix(scope)}${version}`;
}

/** Holds the record of activated versions; it never answers a request. */
export function versionsCacheFor(scope: string): string {
  return `${VERSIONS_CACHE}${SEPARATOR}${encodeURIComponent(scope)}`;
}

/** The versions activated so far, oldest first, once `current` is activated; at most two. */
export function versionsAfterActivating(seen: readonly string[], current: string): string[] {
  return [...seen.filter((version) => version !== current), current].slice(-KEPT_VERSIONS);
}

/** The scope's app caches that hold none of the kept versions. */
export function cachesToDelete(
  names: readonly string[],
  scope: string,
  kept: readonly string[],
): string[] {
  const keptNames = new Set(kept.map((version) => cacheNameFor(scope, version)));
  return names.filter((name) => name.startsWith(appCachePrefix(scope)) && !keptNames.has(name));
}

/**
 * The scope's app caches a request is looked up in: the current version's first, since the
 * cache storage lists the previous version's, which was created earlier, before it.
 */
export function cachesToSearch(names: readonly string[], scope: string, current: string): string[] {
  const currentName = cacheNameFor(scope, current);
  const previous = names.filter(
    (name) => name.startsWith(appCachePrefix(scope)) && name !== currentName,
  );
  return [currentName, ...previous];
}
