import { tick } from "svelte";
import { stripKeyAction } from "./strip-keys";
import {
  endSelecting,
  pick,
  selectedInOrder,
  soleSelection,
  type StripSelection,
} from "./strip-selection";

/** What `StripKeydown` needs from `PictureStrip.svelte`, read fresh on every key. */
export interface StripKeydownPorts {
  readonly strip: () => HTMLElement;
  readonly pictures: () => readonly { readonly id: string }[];
  readonly selection: () => StripSelection;
  readonly order: () => readonly string[];
  readonly onSelectionChange: (next: StripSelection) => void;
  readonly onShiftGroup: (pictureIds: readonly string[], offset: number) => void;
  readonly onRemoveGroup: (pictureIds: readonly string[]) => void;
  readonly onView: (pictureId: string) => void;
  /** False while the strip only shows what is in, with no moving (IMPORT_ARRANGING.md, Add media). */
  readonly arranging: () => boolean;
}

/**
 * The picture strip's keyboard handling (select, focus move, shift, remove), split out of
 * `PictureStrip.svelte` to keep that file under the line limit.
 */
export class StripKeydown {
  readonly #ports: StripKeydownPorts;

  constructor(ports: StripKeydownPorts) {
    this.#ports = ports;
  }

  /** The grid's column count, for moving up and down by a row. */
  columns(): number {
    return getComputedStyle(this.#ports.strip()).gridTemplateColumns.split(" ").length;
  }

  async focusTile(pictureId: string): Promise<void> {
    await tick();
    this.#ports.strip().querySelector<HTMLElement>(`[data-picture-id="${pictureId}"]`)?.focus();
  }

  keydown(event: KeyboardEvent, pictureId: string, index: number): void {
    const { pictures, selection, order, onSelectionChange, onShiftGroup } = this.#ports;
    const action = stripKeyAction(event, index, pictures().length, this.columns());
    if (action === null) {
      return;
    }
    event.preventDefault();
    switch (action.kind) {
      case "toggle":
      case "addToggle":
      case "range":
        onSelectionChange(
          pick(selection(), pictureId, order(), {
            toggleKey: action.kind === "addToggle",
            rangeKey: action.kind === "range",
          }),
        );
        void this.focusTile(pictureId);
        break;
      case "deselect":
        onSelectionChange(endSelecting());
        break;
      case "focus": {
        const next = pictures()[action.index]?.id;
        if (next !== undefined) {
          if (!selection().several && selection().ids.size === 1) {
            onSelectionChange(soleSelection(next));
          }
          void this.focusTile(next);
        }
        break;
      }
      case "shift": {
        if (!this.#ports.arranging()) break;
        const selected = selection().ids.has(pictureId);
        const ids = selected ? selectedInOrder(selection(), order()) : [pictureId];
        if (!selected) {
          onSelectionChange(soleSelection(pictureId));
        }
        onShiftGroup(ids, action.offset);
        void this.focusTile(pictureId);
        break;
      }
      case "remove":
        this.#removeByKey(pictureId, index);
        break;
      case "view":
        this.#ports.onView(pictureId);
        break;
      case "none":
        break;
    }
  }

  /** The focus passes to the first tile outside the removed group, after it in play order. */
  #removeByKey(pictureId: string, index: number): void {
    const { pictures, selection, order, onRemoveGroup } = this.#ports;
    const ids = selection().ids.has(pictureId)
      ? selectedInOrder(selection(), order())
      : [pictureId];
    const removed = new Set(ids);
    const list = pictures();
    const neighbour =
      list.find((picture, i) => i > index && !removed.has(picture.id))?.id ??
      [...list]
        .slice(0, index)
        .reverse()
        .find((picture) => !removed.has(picture.id))?.id ??
      null;
    onRemoveGroup(ids);
    if (neighbour !== null) {
      void this.focusTile(neighbour);
    }
  }
}
