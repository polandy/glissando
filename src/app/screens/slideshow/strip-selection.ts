export { isContiguous } from "../../../library/group-order";

/**
 * The strip's selection (dev-docs/APP.md, Select and reorder; Selecting several): a single
 * picture, or, while `several`, any number of them. `anchor` is the last tile a plain or
 * toggling pick landed on, the start a range pick extends from. `startedBySelect` is set only
 * by the "Select" toggle, which keeps several going with nothing selected.
 */
export interface StripSelection {
  readonly ids: ReadonlySet<string>;
  readonly several: boolean;
  readonly startedBySelect: boolean;
  readonly anchor: string | null;
}

export const NO_SELECTION: StripSelection = {
  ids: new Set(),
  several: false,
  startedBySelect: false,
  anchor: null,
};

function toggled(ids: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(ids);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}

function union(a: ReadonlySet<string>, b: readonly string[]): Set<string> {
  return new Set([...a, ...b]);
}

/** The ids from `anchor` to `id`, inclusive, in play order. */
function range(anchor: string, id: string, order: readonly string[]): readonly string[] {
  const from = order.indexOf(anchor);
  const to = order.indexOf(id);
  if (from === -1 || to === -1) {
    return [id];
  }
  const [start, end] = from <= to ? [from, to] : [to, from];
  return order.slice(start, end + 1);
}

/** Several with `ids`; empty and not started by "Select" ends it (deselecting the last one). */
function several(
  startedBySelect: boolean,
  ids: ReadonlySet<string>,
  anchor: string | null,
): StripSelection {
  if (ids.size === 0 && !startedBySelect) {
    return { ids, several: false, startedBySelect: false, anchor };
  }
  return { ids: new Set(ids), several: true, startedBySelect, anchor };
}

/**
 * A tile picked by tap, click, Space or Enter. Outside several, a plain pick selects only `id`
 * (deselecting it if it was the sole selection); `toggleKey` or `rangeKey` enters several,
 * keeping a single prior selection in it. Inside several, a plain pick toggles `id`'s
 * membership; `rangeKey` adds the range from `anchor` instead, without moving the anchor.
 */
export function pick(
  selection: StripSelection,
  id: string,
  order: readonly string[],
  { toggleKey, rangeKey }: { readonly toggleKey: boolean; readonly rangeKey: boolean },
): StripSelection {
  if (selection.several) {
    if (rangeKey && selection.anchor !== null) {
      return several(
        selection.startedBySelect,
        union(selection.ids, range(selection.anchor, id, order)),
        selection.anchor,
      );
    }
    return several(selection.startedBySelect, toggled(selection.ids, id), id);
  }
  if (toggleKey || rangeKey) {
    const ids =
      rangeKey && selection.anchor !== null
        ? union(selection.ids, range(selection.anchor, id, order))
        : toggled(selection.ids, id);
    return several(false, ids, id);
  }
  const soleSelected = selection.ids.size === 1 && selection.ids.has(id);
  return {
    ids: soleSelected ? new Set() : new Set([id]),
    several: false,
    startedBySelect: false,
    anchor: id,
  };
}

/**
 * A tile held (a mouse press, or a touch hold once it lifts): enters several. Outside several
 * the selection becomes just `id`; inside, `id` is added if missing, never toggled off.
 */
export function hold(selection: StripSelection, id: string): StripSelection {
  const ids = selection.several ? new Set(selection.ids).add(id) : new Set([id]);
  return { ids, several: true, startedBySelect: selection.startedBySelect, anchor: id };
}

/** The "Select" toggle: enters several, keeping a single prior selection in it. */
export function startSelecting(selection: StripSelection): StripSelection {
  return {
    ids: new Set(selection.ids),
    several: true,
    startedBySelect: true,
    anchor: selection.anchor,
  };
}

/** Done, Esc, or "Select" again: deselects all and leaves several. */
export function endSelecting(): StripSelection {
  return NO_SELECTION;
}

/** Drops ids no longer in `order` (a picture removed); same instance when nothing changes. */
export function withoutRemoved(
  selection: StripSelection,
  order: readonly string[],
): StripSelection {
  const present = new Set(order);
  const kept = [...selection.ids].filter((id) => present.has(id));
  if (kept.length === selection.ids.size) {
    return selection;
  }
  const anchor =
    selection.anchor !== null && present.has(selection.anchor) ? selection.anchor : null;
  return several(selection.startedBySelect, new Set(kept), anchor);
}

/** The selected ids in play order, for the bar's "4–6 of 12" and the dragged stack. */
export function selectedInOrder(
  selection: StripSelection,
  order: readonly string[],
): readonly string[] {
  return order.filter((id) => selection.ids.has(id));
}
