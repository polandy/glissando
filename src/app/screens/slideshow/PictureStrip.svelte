<script lang="ts">
  import { animationFrames } from "../../../player";
  import { browserScheduler } from "../../../ui-kit/scheduler";
  import { getTranslator } from "../../i18n/context";
  import AddTile from "./AddTile.svelte";
  import CardTile from "./card-sheet/CardTile.svelte";
  import ChapterTile from "./ChapterTile.svelte";
  import DragGhost from "./DragGhost.svelte";
  import { lookFilterUrl } from "./look-filter-id";
  import LookFilterDefs from "./LookFilterDefs.svelte";
  import PlaceholderTile from "./PlaceholderTile.svelte";
  import type { PictureStripProps } from "./picture-strip-props";
  import { hitTest } from "./strip-hit-test";
  import StripTile from "./StripTile.svelte";
  import { hold, pick } from "./strip-selection";
  import { StripKeydown } from "./strip-keydown";
  import { TileDrag } from "./tile-drag";
  import { glideTiles, tilePositions } from "./tile-glide";
  import type { TileDragState } from "./tile-drag-types";

  /** The pictures in play order as tiles: select, remove, and reorder by drag or keyboard. */
  let {
    pictures,
    look,
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
    onAdd = () => undefined,
    add,
    openingCard,
    closingCard,
    onOpenOpeningCard = () => undefined,
    onOpenClosingCard = () => undefined,
    holdScheduler = browserScheduler,
    frameScheduler = animationFrames,
    arranging = true,
    suppressCards = false,
    placeholderCount = 0,
    lastRemovable = false,
    chapters = [],
    onOpenChapter = () => undefined,
  }: PictureStripProps = $props();

  const { t } = getTranslator();
  let openingTile = $state<CardTile>();
  let closingTile = $state<CardTile>();

  // Scopes this strip's filter ids from any other `LookFilterDefs` instance in the document.
  const filterPrefix = crypto.randomUUID();
  const lookFilter = $derived(lookFilterUrl(filterPrefix, look));

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
  const removable = $derived(lastRemovable || !lastPicture);
  const order = $derived(pictures.map((picture) => picture.id));
  const tileById = $derived(new Map(pictures.map((picture) => [picture.id, picture])));
  // Hidden automatic chapters are omitted entirely (TRIP_CHAPTERS.md): the strip never shows them.
  const chapterByAnchor = $derived(
    new Map(
      chapters
        .filter((chapter) => !chapter.hidden)
        .map((chapter) => [chapter.anchorPictureId, chapter]),
    ),
  );

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
    arranging: () => arranging,
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
    if (!arranging) {
      return;
    }
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

<LookFilterDefs prefix={filterPrefix} />

<ol class="strip" bind:this={strip} onpointerdown={pointerDown} oncontextmenu={contextmenu}>
  {#if !suppressCards}
    <CardTile
      bind:this={openingTile}
      card={openingCard}
      {pictures}
      label={t("cards.openingTile")}
      onOpen={onOpenOpeningCard}
    />
  {/if}
  {#each pictures as picture, index (picture.id)}
    {@const chapter = chapterByAnchor.get(picture.id)}
    {#if chapter !== undefined}
      <ChapterTile {chapter} onOpen={() => onOpenChapter(chapter.anchorPictureId)} />
    {/if}
    <StripTile
      {picture}
      number={index + 1}
      selected={selection.ids.has(picture.id)}
      selecting={selection.several}
      isNew={newPictureIds.has(picture.id)}
      {lookFilter}
      {mousePointer}
      dragging={dragState.groupIds?.includes(picture.id) ?? false}
      drop={dragState.dropMark?.pictureId === picture.id
        ? dragState.dropMark.after
          ? "after"
          : "before"
        : null}
      {removable}
      onPick={(event) => clickTile(event, picture.id)}
      onOpen={() => openOnDoubleClick(picture.id)}
      onKeydown={(event) => keydown(event, picture.id, index)}
      onRemove={() => onRemove(picture.id)}
    />
  {/each}
  {#each { length: placeholderCount }, index (index)}
    <PlaceholderTile active={index === 0} />
  {/each}
  {#if add}
    {@render add()}
  {:else if !suppressCards}
    <AddTile {onAdd} />
  {/if}
  {#if !suppressCards}
    <CardTile
      bind:this={closingTile}
      card={closingCard}
      {pictures}
      label={t("cards.closingTile")}
      onOpen={onOpenClosingCard}
    />
  {/if}
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
