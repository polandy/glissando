import { orderWithGroupShifted } from "../../../library/group-order";
import { isContiguous, selectedInOrder, type StripSelection } from "./strip-selection";

/** The selection bar's Remove label: which message, and the count it names (none: no count). */
export type RemoveLabel =
  | { readonly key: "slideshow.removePictures"; readonly count: number }
  | { readonly key: "slideshow.removeNoPictures" };

export interface SelectionBarOptions {
  /** False while adding: no moving. */
  readonly arranging: boolean;
  /** Whether the host offers inserting a chapter. */
  readonly canInsertChapter: boolean;
  /** Whether the host offers moving to an insertion. */
  readonly canMoveGroup: boolean;
}

/** What the selection bar shows and enables, from the selection and the play order alone. */
export interface SelectionBarView {
  readonly selectedIds: readonly string[];
  readonly count: number;
  /** The first selected picture, the one a sole action acts on; null with nothing selected. */
  readonly soleId: string | null;
  /** Its index in the order, -1 with nothing selected. */
  readonly soleIndex: number;
  /** One picture is the target: not selecting several, or several that came to one. */
  readonly single: boolean;
  /** 1-based positions of a contiguous selection; null when empty or split. */
  readonly range: { readonly from: number; readonly to: number } | null;
  /** Disabled exactly when moving that way would change nothing, or nothing is selected. */
  readonly earlierDisabled: boolean;
  readonly laterDisabled: boolean;
  readonly removeLabel: RemoveLabel;
  /** Selecting several: nothing selected. A single selection: the last picture, which stays. */
  readonly removeDisabledLook: boolean;
  readonly showChapter: boolean;
  readonly showMoveTo: boolean;
}

export function selectionBarView(
  selection: StripSelection,
  order: readonly string[],
  options: SelectionBarOptions,
): SelectionBarView {
  const selectedIds = selectedInOrder(selection, order);
  const count = selectedIds.length;
  const soleId = selectedIds[0] ?? null;
  const last = selectedIds.at(-1);
  const single = !selection.several || count === 1;
  const range =
    soleId !== null && last !== undefined && isContiguous(selection.ids, order)
      ? { from: order.indexOf(soleId) + 1, to: order.indexOf(last) + 1 }
      : null;
  const cannotShift = (offset: number): boolean =>
    count === 0 || orderWithGroupShifted(order, selection.ids, offset) === order;
  return {
    selectedIds,
    count,
    soleId,
    soleIndex: soleId === null ? -1 : order.indexOf(soleId),
    single,
    range,
    earlierDisabled: cannotShift(-1),
    laterDisabled: cannotShift(1),
    removeLabel:
      !selection.several || count > 0
        ? { key: "slideshow.removePictures", count: selection.several ? count : 1 }
        : { key: "slideshow.removeNoPictures" },
    removeDisabledLook: selection.several ? count === 0 : order.length < 2,
    showChapter: single && options.canInsertChapter,
    showMoveTo: options.arranging && options.canMoveGroup && count > 0,
  };
}
