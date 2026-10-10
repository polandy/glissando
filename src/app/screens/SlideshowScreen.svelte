<script lang="ts">
  import { flushSync } from "svelte";
  import Header from "../components/Header.svelte";
  import { getTranslator } from "../i18n/context";
  import InfoPanel from "./slideshow/InfoPanel.svelte";
  import MoreMenu from "./slideshow/MoreMenu.svelte";
  import PictureStrip from "./slideshow/PictureStrip.svelte";
  import PlayPreview from "./slideshow/PlayPreview.svelte";
  import SelectionBar from "./slideshow/SelectionBar.svelte";
  import StripHead from "./slideshow/StripHead.svelte";
  import TransitionsSheet from "./slideshow/TransitionsSheet.svelte";
  import ExportSheets from "./slideshow/ExportSheets.svelte";
  import type { HtmlExportSession } from "../html-export/html-export-session";
  import type { ExportPreview } from "../video-export/slideshow-video-export";
  import type { VideoExportSession } from "../video-export/video-export-session";
  import MissingPicturesNotice from "./slideshow/MissingPicturesNotice.svelte";
  import DeleteDialog from "./slideshow/DeleteDialog.svelte";
  import type { SlideshowDetails, SlideshowStorage, StorageAction } from "./view-models";
  import type { SlideshowTransition } from "../../library/own-timing";
  import type { MotionPreviewPorts } from "../picture-editor/motion-preview";
  import type { ExportMenuState } from "../glissando-file/export-menu";
  import {
    endSelecting,
    NO_SELECTION,
    startSelecting,
    withoutRemoved,
    type StripSelection,
  } from "./slideshow/strip-selection";
  import { browserScheduler, type Scheduler } from "../../ui-kit/scheduler";
  import { animationFrames, type FrameScheduler } from "../../player";

  let {
    slideshow,
    onBack,
    onPlay,
    onAddPictures,
    newPictureIds = new Set(),
    onRemove,
    onShiftGroup,
    onRemoveGroup,
    onMoveGroup,
    onRename,
    onEdit,
    onEditMusic,
    onTransition,
    onResetTransition,
    previewPorts,
    reducedMotion,
    onDelete,
    exportState,
    onExport,
    onMenuOpened,
    newVideoExport,
    newHtmlExport,
    mousePointer,
    saving,
    storage = null,
    onStorageAction,
    selection = $bindable(NO_SELECTION),
    holdScheduler = browserScheduler,
    frameScheduler = animationFrames,
  }: {
    slideshow: SlideshowDetails;
    onBack: () => void;
    onPlay: () => void;
    /** "Add pictures" in the strip header. */
    onAddPictures: () => void;
    /** The pictures just added, marked as new while the screen is shown. */
    newPictureIds?: ReadonlySet<string>;
    /** The tile's own ✕: removes just that picture, never the rest of the selection. */
    onRemove: (pictureId: string) => void;
    /** Earlier/Later and Shift+arrows: moves the group by `offset` steps (ADR-0019). */
    onShiftGroup: (pictureIds: readonly string[], offset: number) => void;
    /** The selection bar's Remove, or Delete/Backspace on a focused (selected) tile. */
    onRemoveGroup: (pictureIds: readonly string[]) => void;
    /** A drop: moves the group to the slot before the tile at `insertion`. */
    onMoveGroup: (pictureIds: readonly string[], insertion: number) => void;
    onRename: (typed: string) => void;
    /** Opens the picture editor for a picture. */
    onEdit: (pictureId: string) => void;
    /** Opens the music editor; only offered with music. */
    onEditMusic: () => void;
    /** The slideshow's default transition was picked in its sheet. */
    onTransition: (transition: SlideshowTransition) => void;
    /** "Back to crossfade" in the transitions sheet. */
    onResetTransition: () => void;
    /** The transitions sheet's tiles loop on these. */
    previewPorts: MotionPreviewPorts;
    /** The transitions sheet's tiles stand still. */
    reducedMotion: boolean;
    /** The user confirmed deleting the whole slideshow. */
    onDelete: () => void;
    exportState: ExportMenuState;
    onExport: () => void;
    /** The ⋯ menu opened. */
    onMenuOpened: () => void;
    /** A video export of the slideshow as it is now, for the sheet "Save as video". */
    newVideoExport: () => VideoExportSession<ExportPreview>;
    /** A web page export of the slideshow as it is now, for the sheet "Save as web page". */
    newHtmlExport: () => HtmlExportSession;
    /** The primary pointer is a mouse (hovers, fine): a double-click opens a picture. */
    mousePointer: boolean;
    /** An edit is being stored. */
    saving: boolean;
    /** Where the slideshow lives; null while the server library is off. */
    storage?: SlideshowStorage | null;
    onStorageAction: (action: StorageAction) => void;
    /** The selection bar acts on this; kept by the parent across the picture editor. */
    selection?: StripSelection;
    /** The strip's 450 ms touch hold; a real timeout by default, faked in tests. */
    holdScheduler?: Scheduler;
    /** The strip's auto-scroll frames; real `requestAnimationFrame` by default, faked in tests. */
    frameScheduler?: FrameScheduler;
  } = $props();

  const { t } = getTranslator();

  let confirmingDelete = $state(false);
  let editingTransitions = $state(false);
  const order = $derived(slideshow.pictures.map((picture) => picture.id));
  // A selected picture that was removed meanwhile leaves no selection (and, unless "Select"
  // started it, leaves selecting several too): kept in sync should the pictures prop change for
  // some other reason too.
  $effect(() => {
    selection = withoutRemoved(selection, order);
  });
  const showBar = $derived(selection.ids.size > 0 || selection.several);

  /**
   * Removing every picture is refused (a toast explains why), keeping the selection; otherwise
   * the removed ids leave it at once, ahead of the pictures prop making the same trip back down.
   */
  function removeGroup(pictureIds: readonly string[]): void {
    onRemoveGroup(pictureIds);
    if (pictureIds.length < order.length) {
      const removed = new Set(pictureIds);
      selection = withoutRemoved(
        selection,
        order.filter((id) => !removed.has(id)),
      );
    }
  }

  let moreMenu = $state<MoreMenu>();
  let infoPanel = $state<InfoPanel>();
  let exportSheets = $state<ExportSheets>();

  /** Focus goes back to the row the sheet was opened from. */
  function closeTransitions(): void {
    editingTransitions = false;
    // The modal dialog must be gone first: until then the page behind it is inert.
    flushSync();
    infoPanel?.focusTransitions();
  }

  /** Keep or Esc: focus goes back to the ⋯ button the dialog was opened from. */
  function keepSlideshow(): void {
    confirmingDelete = false;
    // The modal dialog must be gone first: until then the page behind it is inert.
    flushSync();
    moreMenu?.focus();
  }

  function deleteConfirmed(): void {
    confirmingDelete = false;
    onDelete();
  }
</script>

<div class="screen" class:selecting={showBar} aria-busy={saving}>
  <Header crumbs={[t("start.library"), slideshow.title]} {onBack}>
    {#snippet actions()}
      <MoreMenu
        bind:this={moreMenu}
        {exportState}
        {onExport}
        onOpened={onMenuOpened}
        onDelete={() => (confirmingDelete = true)}
        {storage}
        pictureCount={slideshow.pictures.length}
        {onStorageAction}
      />
    {/snippet}
  </Header>
  <main class="content">
    <div class="detail">
      <div class="pictures">
        <PlayPreview
          coverUrl={slideshow.coverUrl}
          durationSeconds={slideshow.durationSeconds}
          {onPlay}
        />

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
          onRemoveGroup={removeGroup}
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

      <InfoPanel
        bind:this={infoPanel}
        {slideshow}
        {onPlay}
        {storage}
        onSaveVideo={() => exportSheets?.openVideo()}
        onSaveWebPage={() => exportSheets?.openWebPage()}
        {onRename}
        {onEditMusic}
        onEditTransitions={() => (editingTransitions = true)}
      />
    </div>
  </main>
  <!-- Inside the screen, so the container query narrows it with the layout. -->
  {#if showBar}
    <SelectionBar
      {selection}
      {order}
      {onShiftGroup}
      onRemoveGroup={removeGroup}
      {onEdit}
      onDone={() => (selection = endSelecting())}
    />
  {/if}
</div>

{#if editingTransitions}
  <TransitionsSheet
    {slideshow}
    ports={previewPorts}
    {reducedMotion}
    {onTransition}
    onReset={onResetTransition}
    onClose={closeTransitions}
  />
{/if}

<ExportSheets
  bind:this={exportSheets}
  {slideshow}
  {newVideoExport}
  {newHtmlExport}
  onVideoClosed={() => infoPanel?.focusSaveVideo()}
  onHtmlClosed={() => infoPanel?.focusSaveWebPage()}
/>

{#if confirmingDelete}
  <DeleteDialog
    title={slideshow.title}
    pictureCount={slideshow.pictures.length}
    onServer={storage?.kind === "server"}
    onKeep={keepSlideshow}
    onDelete={deleteConfirmed}
  />
{/if}

<style>
  .detail {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 24px;
    align-items: start;
  }
  .pictures {
    display: grid;
    gap: 20px;
  }
  /*
   * Room below the content for the selection bar fixed over it, so the last row scrolls clear;
   * a tile scrolled into view keeps the same distance (StripTile's scroll margin).
   */
  .screen {
    --selection-bar-height: 54px;
    --selection-bar-inset: 16px;
    --selection-bar-gap: 12px;
  }
  .screen.selecting {
    --selection-clearance: calc(
      var(--selection-bar-height) + var(--selection-bar-inset) + var(--selection-bar-gap)
    );
  }
  .screen.selecting .content {
    padding-bottom: var(--selection-clearance);
  }
  @container (max-width: 720px) {
    /* A container query styles descendants only: the bar and the content inherit this. */
    .screen > :global(*) {
      --selection-bar-inset: 10px;
    }
    .detail {
      grid-template-columns: 1fr;
    }
  }
</style>
