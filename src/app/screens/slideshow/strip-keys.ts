/** What a key on a focused picture tile does; `null` leaves the key to the browser. */
export type StripKeyAction =
  | { readonly kind: "focus"; readonly index: number }
  | { readonly kind: "shift"; readonly offset: number }
  | { readonly kind: "toggle" | "addToggle" | "range" | "remove" | "deselect" | "none" };

const HORIZONTAL_STEPS: Readonly<Record<string, number>> = { ArrowLeft: -1, ArrowRight: 1 };
const VERTICAL_STEPS: Readonly<Record<string, number>> = { ArrowUp: -1, ArrowDown: 1 };
const KEY_ACTIONS: Readonly<Record<string, "remove" | "deselect">> = {
  Delete: "remove",
  Backspace: "remove",
  Escape: "deselect",
};

/**
 * Arrows walk the grid (up and down by one row of `columns`); Shift+arrows carry the group by
 * that step instead (ADR-0019, `group-order.ts` clamps it, so this needs no range check). Space
 * and Enter toggle the tile; Ctrl/⌘+Space and Shift+Space start or extend selecting several.
 */
export function stripKeyAction(
  event: {
    readonly key: string;
    readonly shiftKey: boolean;
    readonly ctrlKey: boolean;
    readonly metaKey: boolean;
  },
  index: number,
  count: number,
  columns: number,
): StripKeyAction | null {
  if (event.key === " ") {
    if (event.shiftKey) {
      return { kind: "range" };
    }
    return event.ctrlKey || event.metaKey ? { kind: "addToggle" } : { kind: "toggle" };
  }
  if (event.key === "Enter") {
    return { kind: "toggle" };
  }
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
  if (event.shiftKey) {
    return { kind: "shift", offset: step };
  }
  const target = index + step;
  return target < 0 || target >= count ? { kind: "none" } : { kind: "focus", index: target };
}
