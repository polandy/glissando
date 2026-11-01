<script lang="ts">
  import Header from "../components/Header.svelte";
  import PictureViewer from "../components/PictureViewer.svelte";
  import { viewerEntries } from "../components/picture-viewer-view";
  import { getTranslator } from "../i18n/context";
  import InfoPanel from "./slideshow/InfoPanel.svelte";
  import { slideshowFocusFailed } from "./slideshow/focus-menu-hint";
  import MoreMenu from "./slideshow/MoreMenu.svelte";
  import PicturesColumn from "./slideshow/PicturesColumn.svelte";
  import SelectionBar from "./slideshow/SelectionBar.svelte";
  import SlideshowEditSheets from "./slideshow/SlideshowEditSheets.svelte";
  import SlideshowScreenOverlays from "./slideshow/SlideshowScreenOverlays.svelte";
  import {
    endSelecting,
    NO_SELECTION,
    soleSelection,
    withoutRemoved,
  } from "./slideshow/strip-selection";
  import { browserScheduler } from "../../ui-kit/scheduler";
  import { animationFrames } from "../../player";
  import type { SlideshowScreenProps } from "./slideshow-screen-props";
  let {
    slideshow,
    onBack,
    onPlay,
    pulsePlay = false,
    onAddPictures,
    newPictureIds = new Set(),
    onRemove,
    onShiftGroup,
    onRemoveGroup,
    onShuffle,
    onMoveGroup,
    onRename,
    onEdit,
    loadPicture,
    onError,
    onEditMusic,
    onTransition,
    onResetTransition,
    onLook,
    onResetLook,
    moodBpm,
    moodBeats,
    moodPreviewPorts,
    onMood,
    onResetMood,
    onEnergyPacing,
    onPortraitPictures,
    onResetPortraitPictures,
    onEnsureOpeningCard,
    onOpeningCard,
    onRemoveOpeningCard,
    onEnsureClosingCard,
    onClosingCard,
    onRemoveClosingCard,
    chapterEditor,
    previewPorts,
    reducedMotion,
    onDelete,
    exportState,
    onExport,
    onShareOpened,
    newVideoExport,
    newHtmlExport,
    mousePointer,
    saving,
    storage = null,
    serverRows = null,
    onStorageAction,
    fineSettingsFold,
    selection = $bindable(NO_SELECTION),
    holdScheduler = browserScheduler,
    frameScheduler = animationFrames,
    focus,
    focusSearch,
    focusPaused,
    onLookAgain,
  }: SlideshowScreenProps = $props();

  const { t } = getTranslator();

  let viewing = $state<string | null>(null);
  const order = $derived(slideshow.pictures.map((picture) => picture.id));
  const viewerEntryList = $derived(viewerEntries(slideshow.pictures, []));
  const viewerUrls = $derived(
    new Map(slideshow.pictures.map((picture) => [picture.id, picture.thumbnailUrl])),
  );
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
  let picturesColumn = $state<PicturesColumn>();
  let editSheets = $state<SlideshowEditSheets>();
  let overlays = $state<SlideshowScreenOverlays>();
</script>

<div class="screen" class:selecting={showBar} aria-busy={saving}>
  <Header crumbs={[t("start.library"), slideshow.title]} {onBack}>
    {#snippet actions()}
      <MoreMenu
        bind:this={moreMenu}
        onDelete={() => overlays?.openDelete()}
        {storage}
        pictureCount={slideshow.pictures.length}
        {onStorageAction}
        focusFailed={slideshowFocusFailed(focus, slideshow.pictures, focusSearch, focusPaused)}
        onFocus={() => overlays?.showFocus()}
      />
    {/snippet}
  </Header>
  <main class="content">
    <div class="detail">
      <PicturesColumn
        bind:this={picturesColumn}
        {slideshow}
        {onPlay}
        {pulsePlay}
        {onAddPictures}
        {newPictureIds}
        bind:selection
        {mousePointer}
        {onEdit}
        onView={(pictureId) => (viewing = pictureId)}
        {onRemove}
        onRemoveGroup={removeGroup}
        {onShuffle}
        {onShiftGroup}
        {onMoveGroup}
        onOpenOpeningCard={() => editSheets?.openOpeningCard()}
        onOpenClosingCard={() => editSheets?.openClosingCard()}
        onOpenChapter={(anchorPictureId) => editSheets?.openChapter(anchorPictureId)}
        {storage}
        {onStorageAction}
        {holdScheduler}
        {frameScheduler}
      />
      <InfoPanel
        bind:this={infoPanel}
        {slideshow}
        {storage}
        {serverRows}
        {onRename}
        onShare={() => overlays?.openShare()}
        {onEditMusic}
        onEditTransitions={() => editSheets?.openTransitions()}
        onEditLook={() => editSheets?.openLook()}
        onEditMood={() => editSheets?.openMood()}
        onEditPortraitPictures={() => editSheets?.openPortraitPictures()}
        {chapterEditor}
        {fineSettingsFold}
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
      onView={(pictureId) => (viewing = pictureId)}
      onDone={() => (selection = endSelecting())}
      onInsertChapter={(pictureId) => editSheets?.insertAndOpenChapter(pictureId)}
      {holdScheduler}
    />
  {/if}
</div>

{#if viewing !== null}
  <PictureViewer
    entries={viewerEntryList}
    pictureId={viewing}
    urls={viewerUrls}
    {loadPicture}
    {onError}
    onShow={(pictureId) => (viewing = pictureId)}
    onRemove={slideshow.pictures.length > 1 ? onRemove : undefined}
    onClose={(pictureId) => {
      viewing = null;
      if (!selection.several && selection.ids.size === 1) selection = soleSelection(pictureId);
    }}
  />
{/if}

<SlideshowEditSheets
  bind:this={editSheets}
  {slideshow}
  {previewPorts}
  {reducedMotion}
  {onTransition}
  {onResetTransition}
  {onLook}
  {onResetLook}
  {moodPreviewPorts}
  {moodBpm}
  {moodBeats}
  {onMood}
  {onResetMood}
  {onEnergyPacing}
  {onPortraitPictures}
  {onResetPortraitPictures}
  onTransitionsClosed={() => infoPanel?.focusTransitions()}
  onLookClosed={() => infoPanel?.focusLook()}
  onMoodClosed={() => infoPanel?.focusMood()}
  onPortraitPicturesClosed={() => infoPanel?.focusPortraitPictures()}
  {onEnsureOpeningCard}
  {onOpeningCard}
  {onRemoveOpeningCard}
  onOpeningCardClosed={() => picturesColumn?.focusOpeningCard()}
  {onEnsureClosingCard}
  {onClosingCard}
  {onRemoveClosingCard}
  onClosingCardClosed={() => picturesColumn?.focusClosingCard()}
  {chapterEditor}
/>

<SlideshowScreenOverlays
  bind:this={overlays}
  {slideshow}
  {storage}
  {focus}
  {focusSearch}
  {focusPaused}
  {onEdit}
  {onLookAgain}
  linkSession={serverRows?.shareLink ?? null}
  {exportState}
  {onExport}
  {onShareOpened}
  {newVideoExport}
  {newHtmlExport}
  {onDelete}
  onClosed={() => moreMenu?.focus()}
  onShareClosed={() => infoPanel?.focusShare()}
/>

<style>
  .detail {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 24px;
    align-items: start;
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
  /* Below a desktop the info panel stacks under the play preview instead of squeezing the
     pictures (PicturesColumn dissolves its wrapper to order its parts around the panel). */
  @container (max-width: 1024px) {
    .detail {
      grid-template-columns: 1fr;
      gap: 8px;
    }
  }
  @container (max-width: 720px) {
    /* A container query styles descendants only: the bar and the content inherit this. */
    .screen > :global(*) {
      --selection-bar-inset: 10px;
    }
  }
</style>
