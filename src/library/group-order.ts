/**
 * Moving several pictures together over the play order as an array of ids (dev-docs/APP.md,
 * Select and reorder; ADR-0019). Pure functions over ids and index numbers; the wrappers over a
 * stored slideshow are in `group-edits.ts`.
 */

function checkGroup(order: readonly string[], group: ReadonlySet<string>): void {
  if (group.size === 0) {
    throw new Error("group: expected at least one picture id, got none");
  }
  for (const id of group) {
    if (!order.includes(id)) {
      throw new Error(`order holds no picture "${id}"`);
    }
  }
}

function sameSequence(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/** Whether the group's pictures already sit next to each other in play order. */
export function isContiguous(group: ReadonlySet<string>, order: readonly string[]): boolean {
  const indices = order.flatMap((id, index) => (group.has(id) ? [index] : []));
  const first = indices[0] as number;
  const last = indices[indices.length - 1] as number;
  return last - first + 1 === indices.length;
}

/**
 * The group's pictures contiguous before the tile currently at `insertion` (0..order.length,
 * counted in the order as it is now, group members included), the rest in their order. Returns
 * `order` itself when nothing changes.
 */
export function orderWithGroupAt(
  order: readonly string[],
  group: ReadonlySet<string>,
  insertion: number,
): readonly string[] {
  checkGroup(order, group);
  if (!Number.isInteger(insertion) || insertion < 0 || insertion > order.length) {
    throw new RangeError(
      `insertion: expected 0 to ${order.length} for an order of ${order.length} pictures, got ${insertion}`,
    );
  }
  const rest = order.filter((id) => !group.has(id));
  const groupInOrder = order.filter((id) => group.has(id));
  const restBeforeInsertion = order.slice(0, insertion).filter((id) => !group.has(id)).length;
  const result = [
    ...rest.slice(0, restBeforeInsertion),
    ...groupInOrder,
    ...rest.slice(restBeforeInsertion),
  ];
  return sameSequence(result, order) ? order : result;
}

/**
 * Moves the group by `offset` steps (±1 for Earlier/Later, ±columns for a row). A scattered
 * group first gathers as one block where its first picture is (`offset < 0`) or its last
 * (`offset > 0`), the size of `offset` not mattering for that gather; a contiguous group's block
 * moves by `offset`, clamped to the order's ends. Returns `order` itself when nothing changes.
 */
export function orderWithGroupShifted(
  order: readonly string[],
  group: ReadonlySet<string>,
  offset: number,
): readonly string[] {
  checkGroup(order, group);
  if (!Number.isInteger(offset)) {
    throw new Error(`offset: expected an integer step count, got ${offset}`);
  }
  const indices = order.flatMap((id, index) => (group.has(id) ? [index] : []));
  const first = indices[0] as number;
  const last = indices[indices.length - 1] as number;
  if (last - first + 1 !== indices.length) {
    const insertion = offset < 0 ? first : last + 1;
    return orderWithGroupAt(order, group, insertion);
  }
  const size = indices.length;
  const newStart = Math.min(order.length - size, Math.max(0, first + offset));
  const insertion = offset < 0 ? newStart : newStart + size;
  return orderWithGroupAt(order, group, insertion);
}
