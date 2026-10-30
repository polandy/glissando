import type { DropTarget } from "./tile-drag-types";

/** The tile under a viewport point, and whether a drop lands before or after it. */
export function hitTest(x: number, y: number): DropTarget | null {
  const tile = document.elementFromPoint(x, y)?.closest<HTMLElement>(".pick") ?? null;
  const pictureId = tile?.dataset.pictureId;
  if (tile === null || pictureId === undefined) {
    return null;
  }
  const box = tile.getBoundingClientRect();
  return { pictureId, after: x > box.left + box.width / 2 };
}
