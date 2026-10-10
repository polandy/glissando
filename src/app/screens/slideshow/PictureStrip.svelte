<script lang="ts">
  import { tick } from "svelte";
  import { animationFrames, type FrameScheduler } from "../../../player";
  import { browserScheduler, type Scheduler } from "../../../ui-kit/scheduler";
  import type { PictureTile } from "../view-models";
  import DragGhost from "./DragGhost.svelte";
  import StripTile from "./StripTile.svelte";
  import { stripKeyAction } from "./strip-keys";
  import {
    hold,
    pick,
    selectedInOrder,
    soleSelection,
    endSelecting,
    type StripSelection,
  } from "./strip-selection";
  import { TileDrag, type DropTarget, type TileDragState } from "./tile-drag";

  /** The pictures in play order as tiles: select, remove, and reorder by drag or keyboard. */
  let {
    pictures,
    newPictureIds,
    selection,
    mousePointer,
    onSelectionChange,
    onOpen,
    onRemove,
    onRemoveGroup,
    onShiftGroup,
    onMoveGroup,
    holdScheduler = browserScheduler,
    frameScheduler = animationFrames,
  }: {
    pictures: readonly PictureTile[];
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
    /** Opens the picture editor. */
    onOpen: (pictureId: string) => void;
    /** The 450 ms touch hold; a real timeout by default, faked in tests. */
    holdScheduler?: Scheduler;
    /** The auto-scroll's frames; real `requestAnimationFrame` by default, faked in tests. */
    frameScheduler?: FrameScheduler;
  } = $props();

  let strip: HTMLOListElement;
  let dragState = $state<TileDragState>({
    lifted: false,
    groupIds: null,
    ghost: null,
    dropMark: null,
  });
  let suppressNextClick = false;
  let lastPointerWasTouch = false;
  const lastPicture = $derived(pictures.length < 2);
  const order = $derived(pictures.map((picture) => picture.id));
  const tileById = $derived(new Map(pictures.map((picture) => [picture.id, picture])));

  /** The tile under a viewport point, and whether a drop lands before or after it. */
  function hitTest(x: number, y: number): DropTarget | null {
    const tile = document.elementFromPoint(x, y)?.closest<HTMLElement>(".pick") ?? null;
    const pictureId = tile?.dataset.pictureId;
    if (tile === null || pictureId === undefined) {
      return null;
    }
    const box = tile.getBoundingClientRect();
    return { pictureId, after: x > box.left + box.width / 2 };
  }

  // Fixed for the strip's lifetime: a test passes its fakes once, at mount.
  // svelte-ignore state_referenced_locally
  const drag = new TileDrag({
    holdScheduler,
    frameScheduler,
    hitTest,
    viewportEdges: () => ({ top: 0, bottom: window.innerHeight }),
    selection: () => selection.ids,
    order: () => order,
    onHold: (pictureId) => onSelectionChange(hold(selection, pictureId)),
    onChange: () => (dragState = drag.state),
    onScrollBy: (px) => window.scrollBy(0, px),
    onDrop: (groupIds, insertion) => onMoveGroup(groupIds, insertion),
    onSuppressClick: () => (suppressNextClick = true),
  });

  // A selected tile stays in view, clear of the selection bar (the tiles' scroll margin).
  $effect(() => {
    if (selection.ids.size === 1) {
      const [id] = selection.ids;
      strip
        .querySelector(`[data-picture-id="${id}"]`)
        ?.closest("li")
        ?.scrollIntoView({ block: "nearest" });
    }
  });

  // A lifted touch owns the finger: the page must not scroll under it (ADR-0019). The browser
  // treats a window-level touchmove as passive by default, so this needs an explicit listener.
  $effect(() => {
    const preventWhileLifted = (event: TouchEvent): void => {
      if (dragState.lifted) {
        event.preventDefault();
      }
    };
    window.addEventListener("touchmove", preventWhileLifted, { passive: false });
    return () => window.removeEventListener("touchmove", preventWhileLifted);
  });

  /** The grid's column count, for moving up and down by a row. */
  function columns(): number {
    return getComputedStyle(strip).gridTemplateColumns.split(" ").length;
  }

  async function focusTile(pictureId: string): Promise<void> {
    await tick();
    strip.querySelector<HTMLElement>(`[data-picture-id="${pictureId}"]`)?.focus();
  }

  function keydown(event: KeyboardEvent, pictureId: string, index: number): void {
    const action = stripKeyAction(event, index, pictures.length, columns());
    if (action === null) {
      return;
    }
    event.preventDefault();
    switch (action.kind) {
      case "toggle":
      case "addToggle":
      case "range":
        onSelectionChange(
          pick(selection, pictureId, order, {
            toggleKey: action.kind === "addToggle",
            rangeKey: action.kind === "range",
          }),
        );
        void focusTile(pictureId);
        break;
      case "deselect":
        onSelectionChange(endSelecting());
        break;
      case "focus": {
        const next = pictures[action.index]?.id;
        if (next !== undefined) {
          if (!selection.several && selection.ids.size === 1) {
            onSelectionChange(soleSelection(next));
          }
          void focusTile(next);
        }
        break;
      }
      case "shift": {
        const selected = selection.ids.has(pictureId);
        const ids = selected ? selectedInOrder(selection, order) : [pictureId];
        if (!selected) {
          onSelectionChange(soleSelection(pictureId));
        }
        onShiftGroup(ids, action.offset);
        void focusTile(pictureId);
        break;
      }
      case "remove":
        removeByKey(pictureId, index);
        break;
      case "none":
        break;
    }
  }

  /** The focus passes to the first tile outside the removed group, after it in play order. */
  function removeByKey(pictureId: string, index: number): void {
    const ids = selection.ids.has(pictureId) ? selectedInOrder(selection, order) : [pictureId];
    const removed = new Set(ids);
    const neighbour =
      pictures.find((picture, i) => i > index && !removed.has(picture.id))?.id ??
      [...pictures]
        .slice(0, index)
        .reverse()
        .find((picture) => !removed.has(picture.id))?.id ??
      null;
    onRemoveGroup(ids);
    if (neighbour !== null) {
      void focusTile(neighbour);
    }
  }

  function clickTile(event: MouseEvent, pictureId: string): void {
    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }
    const toggleKey = !lastPointerWasTouch && (event.ctrlKey || event.metaKey);
    const rangeKey = !lastPointerWasTouch && event.shiftKey;
    onSelectionChange(pick(selection, pictureId, order, { toggleKey, rangeKey }));
  }

  function openOnDoubleClick(pictureId: string): void {
    // A double tap on a touch screen is two taps: it selects and deselects, not opening anything.
    // Selecting several has its own use for every tap, so a double-click opens nothing there.
    if (mousePointer && !selection.several) {
      onOpen(pictureId);
    }
  }

  function pointerDown(event: PointerEvent): void {
    lastPointerWasTouch = event.pointerType !== "mouse";
    const pictureId = (event.target as HTMLElement).closest<HTMLElement>(".pick")?.dataset
      .pictureId;
    if (pictureId === undefined) {
      return;
    }
    drag.pointerDown({
      pointerType: lastPointerWasTouch ? "touch" : "mouse",
      x: event.clientX,
      y: event.clientY,
      pictureId,
    });
  }

  function contextmenu(event: MouseEvent): void {
    // A finger held on a tile no longer opens the browser's image menu (ADR-0019).
    if (lastPointerWasTouch && (event.target as HTMLElement).closest(".pick") !== null) {
      event.preventDefault();
    }
  }
</script>

<svelte:window
  onpointermove={(event) => drag.pointerMove({ x: event.clientX, y: event.clientY })}
  onpointerup={() => drag.pointerUp()}
  onpointercancel={() => drag.pointerCancel()}
/>

<ol class="strip" bind:this={strip} onpointerdown={pointerDown} oncontextmenu={contextmenu}>
  {#each pictures as picture, index (picture.id)}
    <StripTile
      {picture}
      number={index + 1}
      selected={selection.ids.has(picture.id)}
      selecting={selection.several}
      isNew={newPictureIds.has(picture.id)}
      {mousePointer}
      dragging={dragState.groupIds?.includes(picture.id) ?? false}
      drop={dragState.dropMark?.pictureId === picture.id
        ? dragState.dropMark.after
          ? "after"
          : "before"
        : null}
      removable={!lastPicture}
      onPick={(event) => clickTile(event, picture.id)}
      onOpen={() => openOnDoubleClick(picture.id)}
      onKeydown={(event) => keydown(event, picture.id, index)}
      onRemove={() => onRemove(picture.id)}
    />
  {/each}
</ol>

<DragGhost
  groupIds={dragState.groupIds}
  position={dragState.ghost}
  thumbnailUrl={(pictureId) => tileById.get(pictureId)?.thumbnailUrl}
/>

<style>
  .strip {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  @container (max-width: 720px) {
    .strip {
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
    }
  }
</style>
