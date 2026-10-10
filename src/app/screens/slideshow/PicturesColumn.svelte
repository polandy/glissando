<script lang="ts">
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
    onRemove,
    onRemoveGroup,
    onShiftGroup,
    onMoveGroup,
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
    onRemove: (pictureId: string) => void;
    onRemoveGroup: (pictureIds: readonly string[]) => void;
    onShiftGroup: (pictureIds: readonly string[], offset: number) => void;
    onMoveGroup: (pictureIds: readonly string[], insertion: number) => void;
    storage: SlideshowStorage | null;
    onStorageAction: (action: StorageAction) => void;
    holdScheduler: Scheduler;
    frameScheduler: FrameScheduler;
  } = $props();
</script>

<div class="pictures">
  <PlayPreview coverUrl={slideshow.coverUrl} durationSeconds={slideshow.durationSeconds} {onPlay} />

  <StripHead
    count={slideshow.pictures.length}
    ownOrder={slideshow.ownOrder}
    selecting={selection.several}
    onToggleSelect={() =>
      (selection = selection.several ? endSelecting() : startSelecting(selection))}
    onAdd={onAddPictures}
  />
  <PictureStrip
    pictures={slideshow.pictures}
    {newPictureIds}
    {selection}
    {mousePointer}
    onSelectionChange={(next) => (selection = next)}
    onOpen={onEdit}
    {onRemove}
    {onRemoveGroup}
    {onShiftGroup}
    {onMoveGroup}
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
