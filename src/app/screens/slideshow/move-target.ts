/** Where "Move to…" puts the selected pictures. */
export type MoveTarget =
  | { readonly kind: "start" }
  | { readonly kind: "end" }
  | { readonly kind: "before"; readonly number: number };

/** The tile position (1-based) a "Before picture" choice is held to: within the order. */
export function clampPictureNumber(number: number, orderLength: number): number {
  return Math.min(orderLength, Math.max(1, number));
}

export function stepPictureNumber(number: number, direction: -1 | 1, orderLength: number): number {
  return clampPictureNumber(number + direction, orderLength);
}

/** The insertion `onMoveGroup` takes: counted in the order as it is now (`orderWithGroupAt`). */
export function insertionFor(target: MoveTarget, orderLength: number): number {
  switch (target.kind) {
    case "start":
      return 0;
    case "end":
      return orderLength;
    case "before":
      return clampPictureNumber(target.number, orderLength) - 1;
  }
}
