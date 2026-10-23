<script lang="ts">
  import { tick } from "svelte";
  import type { FrameScheduler } from "../../../player";
  import type { Scheduler } from "../../../ui-kit/scheduler";
  import type { SlideshowDetails, SlideshowStorage, StorageAction } from "../view-models";
  import MissingPicturesNotice from "./MissingPicturesNotice.svelte";
  import PictureStrip from "./PictureStrip.svelte";
  import PlayPreview from "./PlayPreview.svelte";
  import StripHead from "./StripHead.svelte";
  import { endSelecting, startSelecting, type StripSelection } from "./strip-selection";

  /** The slideshow screen's main column: the play preview, then the strip with its header. */
  let {
    slideshow,
    onPlay,
    onAddPictures,
    newPictureIds,
    selection = $bindable(),
    mousePointer,
    onEdit,
    onView,
    onRemove,
    onRemoveGroup,
    onShuffle,
    onShiftGroup,
    onMoveGroup,
    onOpenOpeningCard,
    onOpenClosingCard,
    storage,
    onStorageAction,
    holdScheduler,
    frameScheduler,
  }: {
    slideshow: SlideshowDetails;
    onPlay: () => void;
    onAddPictures: () => void;
    newPictureIds: ReadonlySet<string>;
    selection: StripSelection;
    mousePointer: boolean;
    /** Opens the picture editor for a picture. */
    onEdit: (pictureId: string) => void;
    /** F on a focused tile: opens it in the full-screen viewer. */
    onView: (pictureId: string) => void;
    onRemove: (pictureId: string) => void;
    onRemoveGroup: (pictureIds: readonly string[]) => void;
    /** Puts the pictures in a new random order. */
    onShuffle: () => void;
    onShiftGroup: (pictureIds: readonly string[], offset: number) => void;
    onMoveGroup: (pictureIds: readonly string[], insertion: number) => void;
    /** Opens the title slide / closing slide sheet (TITLE_SLIDES.md). */
    onOpenOpeningCard: () => void;
    onOpenClosingCard: () => void;
    storage: SlideshowStorage | null;
    onStorageAction: (action: StorageAction) => void;
    holdScheduler: Scheduler;
    frameScheduler: FrameScheduler;
  } = $props();

  let strip = $state<PictureStrip>();

  export function focusOpeningCard(): void {
    strip?.focusOpeningCard();
  }

  /** The tiles glide to their new places, so the shuffle shows. */
  async function shuffle(): Promise<void> {
    const glide = strip?.beginGlide();
    onShuffle();
    await tick();
    glide?.();
  }

  export function focusClosingCard(): void {
    strip?.focusClosingCard();
  }
</script>

<div class="pictures">
  <PlayPreview coverUrl={slideshow.coverUrl} durationSeconds={slideshow.durationSeconds} {onPlay} />

  <StripHead
    count={slideshow.pictures.length}
    ownOrder={slideshow.ownOrder}
    selecting={selection.several}
    onToggleSelect={() =>
      (selection = selection.several ? endSelecting() : startSelecting(selection))}
    onShuffle={shuffle}
    onAdd={onAddPictures}
  />
  <PictureStrip
    bind:this={strip}
    pictures={slideshow.pictures}
    look={slideshow.look}
    {newPictureIds}
    {selection}
    {mousePointer}
    onSelectionChange={(next) => (selection = next)}
    onOpen={onEdit}
    {onView}
    {onRemove}
    {onRemoveGroup}
    {onShiftGroup}
    {onMoveGroup}
    onAdd={onAddPictures}
    openingCard={slideshow.openingCard}
    closingCard={slideshow.closingCard}
    {onOpenOpeningCard}
    {onOpenClosingCard}
    {holdScheduler}
    {frameScheduler}
  />
  {#if storage?.kind === "server" && storage.missingCount > 0}
    <MissingPicturesNotice
      count={storage.missingCount}
      onRemove={() => onStorageAction("removeMissing")}
    />
  {/if}
</div>

<style>
  .pictures {
    display: grid;
    gap: 20px;
  }
</style>
