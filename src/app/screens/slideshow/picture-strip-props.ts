import type { Snippet } from "svelte";
import type { StoredCard } from "../../../library/stored-slideshow";
import type { FrameScheduler, SlideshowLook } from "../../../player";
import type { Scheduler } from "../../../ui-kit/scheduler";
import type { PictureTile } from "../view-models";
import type { StripSelection } from "./strip-selection";

/** `PictureStrip.svelte`'s props, split out to keep that file under the line limit. */
export interface PictureStripProps {
  pictures: readonly PictureTile[];
  /** The slideshow's look (LOOKS.md): graded onto every picture tile, never a card tile. */
  look: SlideshowLook;
  /** Pictures just added, marked as new. */
  newPictureIds: ReadonlySet<string>;
  selection: StripSelection;
  /** The primary pointer is a mouse: a mouse drags after 8 px, a double-click opens a picture. */
  mousePointer: boolean;
  onSelectionChange: (next: StripSelection) => void;
  /** The tile's own ✕: removes just that picture, never the rest of the selection. */
  onRemove: (pictureId: string) => void;
  /** The selection bar's Remove, or Delete/Backspace on a focused (selected) tile. */
  onRemoveGroup: (pictureIds: readonly string[]) => void;
  /** Earlier/Later or Shift+arrows: moves the group by `offset` steps (ADR-0019). */
  onShiftGroup: (pictureIds: readonly string[], offset: number) => void;
  /** A drop: moves the group to the slot before the tile at `insertion`. */
  onMoveGroup: (pictureIds: readonly string[], insertion: number) => void;
  /** The placeholder after the last picture: adds pictures. Unused while `suppressCards`. */
  onAdd?: () => void;
  /** Rendered after the placeholders instead of the default add tile, e.g. a menu's own. */
  add?: Snippet | undefined;
  /** Opens the picture editor. */
  onOpen: (pictureId: string) => void;
  /** F on a focused tile: opens it in the full-screen viewer. */
  onView: (pictureId: string) => void;
  /** The title slide; absent until the editor creates it (TITLE_SLIDES.md). */
  openingCard?: StoredCard | undefined;
  /** The closing slide; absent until the editor creates it (TITLE_SLIDES.md). */
  closingCard?: StoredCard | undefined;
  /** Unused while `suppressCards`. */
  onOpenOpeningCard?: () => void;
  /** Unused while `suppressCards`. */
  onOpenClosingCard?: () => void;
  /** The 450 ms touch hold; a real timeout by default, faked in tests. */
  holdScheduler?: Scheduler;
  /** The auto-scroll's frames; real `requestAnimationFrame` by default, faked in tests. */
  frameScheduler?: FrameScheduler;
  /** False while the strip only shows what is in, with no drag, Shift+arrows or Earlier/Later. */
  arranging?: boolean;
  /** True while importing (IMPORT_ARRANGING.md): no title-slide tiles; `add` replaces the default add tile. */
  suppressCards?: boolean;
  /** Shimmering tiles after the last picture, one per file still being read in; the first runs. */
  placeholderCount?: number;
  /** True lets the very last picture be removed too, unlike the editor. */
  lastRemovable?: boolean;
}
