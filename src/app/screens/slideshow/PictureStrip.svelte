<script lang="ts">
  import type { StoredCard } from "../../../library/stored-slideshow";
  import { animationFrames, type FrameScheduler } from "../../../player";
  import { browserScheduler, type Scheduler } from "../../../ui-kit/scheduler";
  import { getTranslator } from "../../i18n/context";
  import type { PictureTile } from "../view-models";
  import AddTile from "./AddTile.svelte";
  import CardTile from "./card-sheet/CardTile.svelte";
  import DragGhost from "./DragGhost.svelte";
  import StripTile from "./StripTile.svelte";
  import { hold, pick, type StripSelection } from "./strip-selection";
  import { StripKeydown } from "./strip-keydown";
  import { TileDrag } from "./tile-drag";
  import { glideTiles, tilePositions } from "./tile-glide";
  import type { DropTarget, TileDragState } from "./tile-drag-types";

  /** The pictures in play order as tiles: select, remove, and reorder by drag or keyboard. */
  let {
    pictures,
    newPictureIds,
    selection,
    mousePointer,
    onSelectionChange,
    onOpen,
    onView,
    onRemove,
    onRemoveGroup,
    onShiftGroup,
    onMoveGroup,
    onAdd,
    openingCard,
    closingCard,
    onOpenOpeningCard,
    onOpenClosingCard,
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
    /** The placeholder after the last picture: adds pictures. */
    onAdd: () => void;
    /** Opens the picture editor. */
    onOpen: (pictureId: string) => void;
    /** F on a focused tile: opens it in the full-screen viewer. */
    onView: (pictureId: string) => void;
    /** The title slide; absent until the editor creates it (TITLE_SLIDES.md). */
    openingCard?: StoredCard | undefined;
    /** The closing slide; absent until the editor creates it (TITLE_SLIDES.md). */
    closingCard?: StoredCard | undefined;
    onOpenOpeningCard: () => void;
    onOpenClosingCard: () => void;
    /** The 450 ms touch hold; a real timeout by default, faked in tests. */
    holdScheduler?: Scheduler;
    /** The auto-scroll's frames; real `requestAnimationFrame` by default, faked in tests. */
    frameScheduler?: FrameScheduler;
  } = $props();

  const { t } = getTranslator();
  let openingTile = $state<CardTile>();
  let closingTile = $state<CardTile>();

  export function focusOpeningCard(): void {
    openingTile?.focus();
  }

  export function focusClosingCard(): void {
    closingTile?.focus();
  }

  /** Remembers where the tiles are; the returned function glides them from there once the order changed. */
  export function beginGlide(): () => void {
    const shown = strip;
    const before = tilePositions(shown);
    // The screen may have gone by the time the order is rendered.
    return () => {
      if (shown.isConnected) {
        glideTiles(shown, before);
      }
    };
  }

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

  // Fixed for the strip's lifetime: the props it reads are read fresh, by reference, on every key.
  // svelte-ignore state_referenced_locally
  const keydownHandler = new StripKeydown({
    strip: () => strip,
    pictures: () => pictures,
    selection: () => selection,
    order: () => order,
    onSelectionChange,
    onShiftGroup,
    onRemoveGroup,
    onView,
  });

  function keydown(event: KeyboardEvent, pictureId: string, index: number): void {
    keydownHandler.keydown(event, pictureId, index);
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
    // A drop over another tile, or a lifted touch, may send no click to a tile at all: a stale
    // suppression must not swallow this new gesture's click.
    suppressNextClick = false;
    const pictureId = (event.target as HTMLElement).closest<HTMLElement>(".pick")?.dataset
      .pictureId;
    if (pictureId === undefined) {
      return;
    }
    drag.pointerDown({
      pointerType: lastPointerWasTouch ? "touch" : "mouse",
      pointerId: event.pointerId,
      button: event.button,
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

  // The strip unmounting mid-gesture must not leave a hold timer or an auto-scroll loop running.
  $effect(() => () => drag.destroy());
</script>

<svelte:window
  onpointermove={(event) =>
    drag.pointerMove({ pointerId: event.pointerId, x: event.clientX, y: event.clientY })}
  onpointerup={(event) => drag.pointerUp(event.pointerId)}
  onpointercancel={(event) => drag.pointerCancel(event.pointerId)}
/>

<ol class="strip" bind:this={strip} onpointerdown={pointerDown} oncontextmenu={contextmenu}>
  <CardTile
    bind:this={openingTile}
    card={openingCard}
    {pictures}
    label={t("cards.openingTile")}
    onOpen={onOpenOpeningCard}
  />
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
  <AddTile {onAdd} />
  <CardTile
    bind:this={closingTile}
    card={closingCard}
    {pictures}
    label={t("cards.closingTile")}
    onOpen={onOpenClosingCard}
  />
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
