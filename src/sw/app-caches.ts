const APP_CACHE_PREFIX = "glissando-app-";
/** The current version and the one before it, for a tab still running that one (ADR-0005). */
const KEPT_VERSIONS = 2;

export function cacheNameFor(version: string): string {
  return `${APP_CACHE_PREFIX}${version}`;
}

/** The versions activated so far, oldest first, once `current` is activated; at most two. */
export function versionsAfterActivating(seen: readonly string[], current: string): string[] {
  return [...seen.filter((version) => version !== current), current].slice(-KEPT_VERSIONS);
}

export function cachesToDelete(names: readonly string[], kept: readonly string[]): string[] {
  const keptNames = new Set(kept.map(cacheNameFor));
  return names.filter((name) => name.startsWith(APP_CACHE_PREFIX) && !keptNames.has(name));
}
