<script lang="ts">
  import { MediaQuery } from "svelte/reactivity";
  import { animationFrames, type FrameScheduler } from "../../player";
  import type { StoredPicture } from "../../library/stored-slideshow";
  import { browserScheduler, type Scheduler } from "../../ui-kit/scheduler";
  import { MOUSE_POINTER_QUERY } from "../screens/slideshow/pointer";
  import PictureStrip from "../screens/slideshow/PictureStrip.svelte";
  import SelectionBar from "../screens/slideshow/SelectionBar.svelte";
  import StripHead from "../screens/slideshow/StripHead.svelte";
  import AddPicturesMenu from "./AddPicturesMenu.svelte";
  import {
    endSelecting,
    NO_SELECTION,
    soleSelection,
    startSelecting,
    withoutRemoved,
    type StripSelection,
  } from "../screens/slideshow/strip-selection";
  import { importPictureTile } from "./import-tile";
  import { orderedPictures, type ArrangementState } from "./import-arrangement";
  import type { SessionArrangement } from "./session-arrangement";

  const NO_NEW_PICTURES: ReadonlySet<string> = new Set();

  /**
   * The pictures step's strip while an import runs: the editor's own picture strip and selection
   * bar, reused on stored pictures (IMPORT_ARRANGING.md, Arranging). `arrangement` is null in
   * "Add media", which has no arranging: no Earlier, Later, drag, Shift+arrows or Shuffle.
   */
  let {
    pictures,
    urls,
    pending,
    busy,
    arrangement,
    onAddMore,
    onOpenImmich,
    onRemove,
    onView,
    holdScheduler = browserScheduler,
    frameScheduler = animationFrames,
  }: {
    pictures: readonly StoredPicture[];
    /** Thumbnail URLs by picture id; a picture without one yet shimmers like a waiting file. */
    urls: ReadonlyMap<string, string>;
    /** Files accepted but not yet turned into a stored picture. */
    pending: number;
    /** An import is still running: says where a newly-ready picture joins the order. */
    busy: boolean;
    arrangement: SessionArrangement | null;
    /** Null where no pictures come from the device, as for a server slideshow. */
    onAddMore: { readonly onPickFiles: () => void; readonly onPickFolder: () => void } | null;
    /** Null where Immich cannot be opened. */
    onOpenImmich: (() => void) | null;
    onRemove: (pictureId: string) => void;
    onView: (pictureId: string) => void;
    holdScheduler?: Scheduler;
    frameScheduler?: FrameScheduler;
  } = $props();

  const mousePointer = new MediaQuery(MOUSE_POINTER_QUERY);
  let root: HTMLDivElement | undefined = $state();
  // Not a plain $derived below: pruning a removed id reads the selection's own current value,
  // which a derived may not depend on itself.
  // eslint-disable-next-line svelte/prefer-writable-derived -- see comment above
  let selection = $state<StripSelection>(NO_SELECTION);
  // svelte-ignore state_referenced_locally
  let arrangementState = $state.raw<ArrangementState | null>(arrangement?.state ?? null);

  $effect(() => arrangement?.subscribe((next) => (arrangementState = next)));

  const ordered = $derived(
    arrangementState === null ? pictures : orderedPictures(arrangementState, pictures),
  );
  const tiles = $derived(
    ordered.flatMap((picture) => {
      const url = urls.get(picture.id);
      return url === undefined ? [] : [importPictureTile(picture, url)];
    }),
  );
  const order = $derived(tiles.map((tile) => tile.id));
  // A picture whose thumbnail has not loaded yet shimmers like a file still being read.
  const placeholderCount = $derived(pending + (ordered.length - tiles.length));
  const showBar = $derived(selection.ids.size > 0 || selection.several);
  // With neither on offer (linking a server slideshow, Immich unavailable), no add button or tile.
  const showAddMenu = $derived(onAddMore !== null || onOpenImmich !== null);

  // A selected picture that was removed meanwhile leaves no selection.
  $effect(() => {
    selection = withoutRemoved(selection, order);
  });

  function removeGroup(pictureIds: readonly string[]): void {
    for (const pictureId of pictureIds) onRemove(pictureId);
  }

  function shiftGroup(pictureIds: readonly string[], offset: number): void {
    arrangement?.shiftGroup(new Set(pictureIds), offset);
  }

  function moveGroup(pictureIds: readonly string[], insertion: number): void {
    arrangement?.moveGroup(new Set(pictureIds), insertion);
  }

  /** The focus follows a picture taken in from the set-aside ones, or back by an undo. */
  export function focusPicture(pictureId: string): void {
    root?.querySelector<HTMLElement>(`[data-picture-id="${pictureId}"]`)?.focus();
  }

  /** Closing the viewer on a single selection moves it to the shown picture (PICTURE_VIEWER.md). */
  export function moveSelectionToShown(pictureId: string): void {
    if (!selection.several && selection.ids.size === 1) selection = soleSelection(pictureId);
  }
</script>

{#snippet headAdd()}
  <AddPicturesMenu {onAddMore} {onOpenImmich} />
{/snippet}

{#snippet tileAdd()}
  <AddPicturesMenu {onAddMore} {onOpenImmich} tile />
{/snippet}

<div bind:this={root} class="import-strip">
  <StripHead
    count={ordered.length}
    ownOrder={arrangementState?.own ?? false}
    selecting={selection.several}
    onToggleSelect={() =>
      (selection = selection.several ? endSelecting() : startSelecting(selection))}
    onShuffle={() => arrangement?.shuffle()}
    variant="import"
    {busy}
    add={showAddMenu ? headAdd : undefined}
  />
  <PictureStrip
    pictures={tiles}
    newPictureIds={NO_NEW_PICTURES}
    {selection}
    mousePointer={mousePointer.current}
    onSelectionChange={(next) => (selection = next)}
    onOpen={onView}
    {onView}
    {onRemove}
    onRemoveGroup={removeGroup}
    onShiftGroup={shiftGroup}
    onMoveGroup={moveGroup}
    arranging={arrangement !== null}
    suppressCards
    {placeholderCount}
    lastRemovable
    add={showAddMenu ? tileAdd : undefined}
    {holdScheduler}
    {frameScheduler}
  />
  {#if showBar}
    <SelectionBar
      {selection}
      {order}
      onShiftGroup={shiftGroup}
      onRemoveGroup={removeGroup}
      onEdit={onView}
      onDone={() => (selection = endSelecting())}
      arranging={arrangement !== null}
      viewMode
    />
  {/if}
</div>

<style>
  .import-strip {
    display: grid;
    gap: 20px;
    /* Clears ImportFrame's own sticky Cancel/Next bar, under the floating selection bar. */
    --selection-bar-height: 54px;
    --selection-bar-inset: calc(76px + env(safe-area-inset-bottom));
    --selection-bar-gap: 12px;
  }
</style>
