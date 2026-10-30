import type { SlideshowEditor } from "../editing/slideshow-editor";

/** The picture-list edits `SlideshowScreen` triggers directly on the editor, grouped so
 * `SlideshowRoute` passes them to it as one prop. */
export interface SlideshowRoutePictureActions {
  readonly onRemove: (pictureId: string) => void;
  readonly onShiftGroup: (pictureIds: readonly string[], offset: number) => void;
  readonly onRemoveGroup: (pictureIds: readonly string[]) => void;
  readonly onShuffle: () => void;
  readonly onMoveGroup: (pictureIds: readonly string[], insertion: number) => void;
  readonly onRename: (typed: string) => void;
}

/**
 * Builds `SlideshowRoutePictureActions` against whichever editor `current` returns at the time
 * one is called, so the actions keep working once the editor loads in behind them.
 */
export function slideshowRoutePictureActions(
  current: () => SlideshowEditor | null,
): SlideshowRoutePictureActions {
  return {
    onRemove: (pictureId) => current()?.remove(pictureId),
    onShiftGroup: (pictureIds, offset) => current()?.shiftGroup(pictureIds, offset),
    onRemoveGroup: (pictureIds) => current()?.removeGroup(pictureIds),
    onShuffle: () => current()?.shuffle(),
    onMoveGroup: (pictureIds, insertion) => current()?.moveGroup(pictureIds, insertion),
    onRename: (typed) => current()?.rename(typed),
  };
}
