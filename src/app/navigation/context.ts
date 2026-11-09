import { getContext } from "svelte";
import type { Navigator } from "./navigator";

const NAVIGATOR_CONTEXT = Symbol("navigator");

/** What components need of the navigator: where the app is, and a way back up the path. */
export type NavigatorSource = Pick<Navigator, "route" | "backTo">;

/** The navigator in effect; call during component initialisation. */
export function getNavigator(): NavigatorSource {
  const navigator = getContext<NavigatorSource | undefined>(NAVIGATOR_CONTEXT);
  if (navigator === undefined) {
    throw new Error("no navigator in context: mount the root with navigatorContext");
  }
  return navigator;
}

/** The context for `mount(App, { context })`, for a root mounted outside a component. */
export function navigatorContext(navigator: NavigatorSource): Map<symbol, unknown> {
  return new Map([[NAVIGATOR_CONTEXT, navigator]]);
}
