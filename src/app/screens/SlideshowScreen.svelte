<script lang="ts">
  import { flushSync } from "svelte";
  import Dialog from "../components/Dialog.svelte";
  import Header from "../components/Header.svelte";
  import { getTranslator } from "../i18n/context";
  import InfoPanel from "./slideshow/InfoPanel.svelte";
  import MoreMenu from "./slideshow/MoreMenu.svelte";
  import PictureStrip from "./slideshow/PictureStrip.svelte";
  import PlayPreview from "./slideshow/PlayPreview.svelte";
  import SelectionBar from "./slideshow/SelectionBar.svelte";
  import TransitionsSheet from "./slideshow/TransitionsSheet.svelte";
  import VideoExportSheet from "./slideshow/VideoExportSheet.svelte";
  import type { ExportPreview } from "../video-export/slideshow-video-export";
  import type { VideoExportSession } from "../video-export/video-export-session";
  import type { SlideshowDetails } from "./view-models";
  import type { SlideshowTransition } from "../../library/own-timing";
  import type { MotionPreviewPorts } from "../picture-editor/motion-preview";
  import type { ExportMenuState } from "../glissando-file/export-menu";

  let {
    slideshow,
    onBack,
    onPlay,
    onRemove,
    onMove,
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
    mousePointer,
    saving,
    selectedId = $bindable(null),
  }: {
    slideshow: SlideshowDetails;
    onBack: () => void;
    onPlay: () => void;
    onRemove: (pictureId: string) => void;
    onMove: (pictureId: string, toIndex: number) => void;
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
    /** The primary pointer is a mouse (hovers, fine): tiles can be dragged. */
    mousePointer: boolean;
    /** An edit is being stored. */
    saving: boolean;
    /** The picture the selection bar acts on; kept by the parent across the picture editor. */
    selectedId?: string | null;
  } = $props();

  const { t } = getTranslator();

  let confirmingDelete = $state(false);
  let editingTransitions = $state(false);
  let videoExport = $state.raw<VideoExportSession<ExportPreview> | null>(null);
  // A selected picture that was removed meanwhile leaves no selection.
  const selectedIndex = $derived(
    slideshow.pictures.findIndex((picture) => picture.id === selectedId),
  );

  function moveSelected(step: number): void {
    if (selectedId !== null) {
      onMove(selectedId, selectedIndex + step);
    }
  }

  function removeSelected(): void {
    if (selectedId !== null) {
      // The last picture stays, and so does its selection.
      const lastPicture = slideshow.pictures.length < 2;
      onRemove(selectedId);
      if (!lastPicture) {
        selectedId = null;
      }
    }
  }

  let moreMenu = $state<MoreMenu>();
  let infoPanel = $state<InfoPanel>();

  /** Focus goes back to the row the sheet was opened from. */
  function closeTransitions(): void {
    editingTransitions = false;
    // The modal dialog must be gone first: until then the page behind it is inert.
    flushSync();
    infoPanel?.focusTransitions();
  }

  /** Focus goes back to the button the sheet was opened from. */
  function closeVideoExport(): void {
    videoExport = null;
    // The modal dialog must be gone first: until then the page behind it is inert.
    flushSync();
    infoPanel?.focusSaveVideo();
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

<div class="screen" class:selecting={selectedIndex >= 0} aria-busy={saving}>
  <Header crumbs={[t("start.library"), slideshow.title]} {onBack}>
    {#snippet actions()}
      <MoreMenu
        bind:this={moreMenu}
        {exportState}
        {onExport}
        onOpened={onMenuOpened}
        onDelete={() => (confirmingDelete = true)}
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

        <div class="strip-head">
          <div>
            <h2 class="eyebrow">{t("slideshow.pictures")}</h2>
            <p class="muted sorted">
              {slideshow.ownOrder ? t("slideshow.ownOrder") : t("slideshow.sortedByDate")} ·
              <span class="wide-hint">{t("slideshow.reorderHintWide")}</span><span
                class="narrow-hint">{t("slideshow.reorderHintNarrow")}</span
              >
            </p>
          </div>
          <span class="mono muted">{slideshow.pictures.length}</span>
        </div>
        <PictureStrip
          pictures={slideshow.pictures}
          {selectedId}
          draggable={mousePointer}
          onSelect={(pictureId) => (selectedId = pictureId)}
          onOpen={onEdit}
          {onRemove}
          {onMove}
        />
      </div>

      <InfoPanel
        bind:this={infoPanel}
        {slideshow}
        {onPlay}
        onSaveVideo={() => (videoExport = newVideoExport())}
        {onRename}
        {onEditMusic}
        onEditTransitions={() => (editingTransitions = true)}
      />
    </div>
  </main>
  <!-- Inside the screen, so the container query narrows it with the layout. -->
  {#if selectedIndex >= 0}
    <SelectionBar
      index={selectedIndex}
      count={slideshow.pictures.length}
      onEarlier={() => moveSelected(-1)}
      onLater={() => moveSelected(1)}
      onEdit={() => selectedId !== null && onEdit(selectedId)}
      onRemove={removeSelected}
      onDone={() => (selectedId = null)}
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

{#if videoExport !== null}
  <VideoExportSheet
    session={videoExport}
    coverUrl={slideshow.coverUrl}
    onClose={closeVideoExport}
  />
{/if}

{#if confirmingDelete}
  <Dialog
    title={t("slideshow.deleteTitle", { title: slideshow.title })}
    message={t("slideshow.deleteText", { count: slideshow.pictures.length })}
    actions={[
      { label: t("slideshow.keep"), onSelect: keepSlideshow },
      { label: t("slideshow.deleteConfirm"), tone: "danger", onSelect: deleteConfirmed },
    ]}
    onCancel={keepSlideshow}
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
  .strip-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
  }
  .strip-head h2 {
    margin: 0;
  }
  .sorted {
    margin: 3px 0 0;
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
  .narrow-hint {
    display: none;
  }
  @container (max-width: 720px) {
    /* A container query styles descendants only: the bar and the content inherit this. */
    .screen > :global(*) {
      --selection-bar-inset: 10px;
    }
    .detail {
      grid-template-columns: 1fr;
    }
    .wide-hint {
      display: none;
    }
    .narrow-hint {
      display: inline;
    }
  }
</style>
