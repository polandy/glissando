/** What a key on a focused picture tile does; `null` leaves the key to the browser. */
export type StripKeyAction =
  | { readonly kind: "focus"; readonly index: number }
  | { readonly kind: "move"; readonly to: number }
  | { readonly kind: "toggle" | "remove" | "deselect" | "none" };

const HORIZONTAL_STEPS: Readonly<Record<string, number>> = { ArrowLeft: -1, ArrowRight: 1 };
const VERTICAL_STEPS: Readonly<Record<string, number>> = { ArrowUp: -1, ArrowDown: 1 };
const KEY_ACTIONS: Readonly<Record<string, "toggle" | "remove" | "deselect">> = {
  Enter: "toggle",
  " ": "toggle",
  Delete: "remove",
  Backspace: "remove",
  Escape: "deselect",
};

/**
 * Arrows walk the grid (up and down by one row of `columns`), Shift+arrows carry the tile along;
 * at the strip's edge the focus stays, a carried tile stops at the end.
 */
export function stripKeyAction(
  event: { readonly key: string; readonly shiftKey: boolean },
  index: number,
  count: number,
  columns: number,
): StripKeyAction | null {
  const named = KEY_ACTIONS[event.key];
  if (named !== undefined) {
    return { kind: named };
  }
  const horizontal = HORIZONTAL_STEPS[event.key];
  const vertical = VERTICAL_STEPS[event.key];
  const step = horizontal ?? (vertical === undefined ? undefined : vertical * columns);
  if (step === undefined) {
    return null;
  }
  const target = index + step;
  if (event.shiftKey) {
    return { kind: "move", to: Math.min(count - 1, Math.max(0, target)) };
  }
  return target < 0 || target >= count ? { kind: "none" } : { kind: "focus", index: target };
}

/** Where a dragged tile lands when dropped before or after the tile at `targetIndex`. */
export function dropIndex(fromIndex: number, targetIndex: number, after: boolean): number {
  const to = targetIndex + (after ? 1 : 0);
  return fromIndex < to ? to - 1 : to;
}
