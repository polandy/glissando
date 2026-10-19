/**
 * Arranging the pictures step's strip for a new slideshow while an import runs
 * (`dev-docs/app/IMPORT_ARRANGING.md`, Order): capture order until the user moves or shuffles a
 * picture, after which it is their own and new pictures join at the end. Pure functions over an
 * order of ids; `PictureIntake`/`ImportSession` hold the state and call `PictureCulling.exempt`
 * for a moved picture.
 */

import { orderWithGroupAt, orderWithGroupShifted } from "../../library/group-order";
import { shuffledIds } from "../../library/shuffle-edits";

export interface ArrangementState {
  /** The ready pictures' ids, in the order the strip shows them. */
  readonly order: readonly string[];
  /** A move or Shuffle made the order the user's own; false keeps it in capture order. */
  readonly own: boolean;
  /** Pictures the user moved: counted as chosen, so a cull never sets them aside. */
  readonly moved: ReadonlySet<string>;
}

export const EMPTY_ARRANGEMENT: ArrangementState = { order: [], own: false, moved: new Set() };

/**
 * The order caught up with the ready pictures, `readyIds` already in capture order. Not own: the
 * order becomes exactly `readyIds`. Own: pictures no longer ready leave the order and `moved`;
 * newly ready ones join at the end, in capture order among themselves; nothing placed moves.
 */
export function reconcile(state: ArrangementState, readyIds: readonly string[]): ArrangementState {
  if (!state.own) {
    return { ...state, order: readyIds };
  }
  const ready = new Set(readyIds);
  const kept = state.order.filter((id) => ready.has(id));
  const keptIds = new Set(kept);
  const added = readyIds.filter((id) => !keptIds.has(id));
  return {
    ...state,
    order: [...kept, ...added],
    moved: new Set([...state.moved].filter((id) => ready.has(id))),
  };
}

/** Moves `group` to sit contiguously before `insertion` (drag, a drop); the order becomes own. */
export function moveGroup(
  state: ArrangementState,
  group: ReadonlySet<string>,
  insertion: number,
): ArrangementState {
  return {
    ...state,
    order: orderWithGroupAt(state.order, group, insertion),
    own: true,
    moved: new Set([...state.moved, ...group]),
  };
}

/** Shifts `group` by `offset` steps (Earlier/Later, Shift+arrows); the order becomes own. */
export function shiftGroup(
  state: ArrangementState,
  group: ReadonlySet<string>,
  offset: number,
): ArrangementState {
  return {
    ...state,
    order: orderWithGroupShifted(state.order, group, offset),
    own: true,
    moved: new Set([...state.moved, ...group]),
  };
}

/** A new random order, the user's own; `moved` is unchanged (Shuffle exempts nothing by itself). */
export function shuffle(state: ArrangementState, random: () => number): ArrangementState {
  return { ...state, order: shuffledIds(state.order, random), own: true };
}

/** The ready `pictures` in the strip's order; one not in the order yet is left out. */
export function orderedPictures<Picture extends { readonly id: string }>(
  state: ArrangementState,
  pictures: readonly Picture[],
): readonly Picture[] {
  const byId = new Map(pictures.map((picture) => [picture.id, picture]));
  return state.order.flatMap((id) => {
    const picture = byId.get(id);
    return picture === undefined ? [] : [picture];
  });
}
