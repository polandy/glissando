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
    pulsePlay,
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
    onOpenChapter,
    storage,
    onStorageAction,
    holdScheduler,
    frameScheduler,
  }: {
    slideshow: SlideshowDetails;
    onPlay: () => void;
    pulsePlay: boolean;
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
    /** Opens the trip chapter's sheet (TRIP_CHAPTERS.md). */
    onOpenChapter: (anchorPictureId: string) => void;
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
  <PlayPreview
    coverUrl={slideshow.coverUrl}
    durationSeconds={slideshow.durationSeconds}
    {onPlay}
    pulse={pulsePlay}
  />

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
    openingCard={slideshow.openingCard}
    closingCard={slideshow.closingCard}
    {onOpenOpeningCard}
    {onOpenClosingCard}
    chapters={slideshow.chapters}
    {onOpenChapter}
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
  /* Stacked: the preview first, the settings card (a sibling of this column) next, then the
     strip, so Play and the first tiles meet on one phone screen. */
  @container (max-width: 1024px) {
    .pictures {
      display: contents;
    }
    .pictures > :global(*) {
      order: 1;
    }
    .pictures > :global(.preview) {
      order: -1;
    }
  }
</style>
