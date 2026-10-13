import type { FocusBox } from "./picture-focus";

/** A face this much smaller (by edge) than the anchor is background and does not widen the group. */
export const MIN_RELATIVE_FACE_EDGE = 0.35;

const edgeOf = (box: FocusBox): number => Math.sqrt(box.width * box.height);

/**
 * The box around the people a motion should frame together: the `anchor` face and every other
 * face that is not much smaller than it (ADR-0029).
 */
export function groupFocusBox(anchor: FocusBox, others: readonly FocusBox[]): FocusBox {
  const minEdge = edgeOf(anchor) * MIN_RELATIVE_FACE_EDGE;
  const members = [anchor, ...others.filter((other) => edgeOf(other) >= minEdge)];
  if (members.length === 1) return anchor;
  const left = Math.min(...members.map((member) => member.x));
  const top = Math.min(...members.map((member) => member.y));
  const right = Math.max(...members.map((member) => member.x + member.width));
  const bottom = Math.max(...members.map((member) => member.y + member.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}
