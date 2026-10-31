import { ancestorAt, parentOf, type Route } from "../navigation/route";

/**
 * One crumb of the header. A string names a screen on the path to the current one and links to
 * it; the object form is a label that is no screen (the import wizard's name) and stays text.
 */
export type Crumb = string | { readonly label: string; readonly isScreen: false };

export function crumbLabel(crumb: Crumb): string {
  return typeof crumb === "string" ? crumb : crumb.label;
}

/** Whether the crumb at `index` links to its screen: a screen crumb before the current one. */
export function isCrumbLink(crumbs: readonly Crumb[], index: number): boolean {
  return index < crumbs.length - 1 && typeof crumbs[index] === "string";
}

/**
 * The screen a link crumb names. The first crumb is the path's root; each later one sits as many
 * levels up as there are screen crumbs after it (the current one included), since a label stands
 * for no level.
 */
export function crumbTarget(crumbs: readonly Crumb[], index: number, current: Route): Route {
  if (index === 0) {
    return ancestorAt(current, depthOf(current));
  }
  const levelsUp = crumbs.slice(index + 1).filter((crumb) => typeof crumb === "string").length;
  return ancestorAt(current, levelsUp);
}

function depthOf(route: Route): number {
  let depth = 0;
  for (let up = parentOf(route); up !== null; up = parentOf(up)) {
    depth += 1;
  }
  return depth;
}
