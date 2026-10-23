<script lang="ts">
  import Header from "../components/Header.svelte";
  import PictureViewer from "../components/PictureViewer.svelte";
  import { viewerEntries } from "../components/picture-viewer-view";
  import { getTranslator } from "../i18n/context";
  import InfoPanel from "./slideshow/InfoPanel.svelte";
  import FocusSheetHost from "./slideshow/FocusSheetHost.svelte";
  import { slideshowFocusMenuHint } from "./slideshow/focus-menu-hint";
  import MoreMenu from "./slideshow/MoreMenu.svelte";
  import PicturesColumn from "./slideshow/PicturesColumn.svelte";
  import SelectionBar from "./slideshow/SelectionBar.svelte";
  import SlideshowEditSheets from "./slideshow/SlideshowEditSheets.svelte";
  import ExportSheets from "./slideshow/ExportSheets.svelte";
  import DeleteFlow from "./slideshow/DeleteFlow.svelte";
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
    onMenuOpened,
    newVideoExport,
    newHtmlExport,
    mousePointer,
    saving,
    storage = null,
    serverRows = null,
    onStorageAction,
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
  let exportSheets = $state<ExportSheets>();
  let focusSheetHost = $state<FocusSheetHost>();
  let deleteFlow = $state<DeleteFlow>();
</script>

<div class="screen" class:selecting={showBar} aria-busy={saving}>
  <Header crumbs={[t("start.library"), slideshow.title]} {onBack}>
    {#snippet actions()}
      <MoreMenu
        bind:this={moreMenu}
        {exportState}
        {onExport}
        onSaveVideo={() => exportSheets?.openVideo()}
        onSaveWebPage={() => exportSheets?.openWebPage()}
        onOpened={onMenuOpened}
        onDelete={() => deleteFlow?.open()}
        {storage}
        pictureCount={slideshow.pictures.length}
        {onStorageAction}
        focusHint={slideshowFocusMenuHint(focus, slideshow.pictures, focusSearch, focusPaused)}
        onFocus={() => focusSheetHost?.show()}
      />
    {/snippet}
  </Header>
  <main class="content">
    <div class="detail">
      <PicturesColumn
        bind:this={picturesColumn}
        {slideshow}
        {onPlay}
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
        {onPlay}
        {storage}
        {serverRows}
        {onRename}
        {onEditMusic}
        onEditTransitions={() => editSheets?.openTransitions()}
        onEditLook={() => editSheets?.openLook()}
        onEditPortraitPictures={() => editSheets?.openPortraitPictures()}
        onEditChapters={() => editSheets?.openGeneralChapters()}
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
  {onPortraitPictures}
  {onResetPortraitPictures}
  onTransitionsClosed={() => infoPanel?.focusTransitions()}
  onLookClosed={() => infoPanel?.focusLook()}
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
  onChaptersClosed={() => infoPanel?.focusChapters()}
/>

<ExportSheets
  bind:this={exportSheets}
  {slideshow}
  {newVideoExport}
  {newHtmlExport}
  onVideoClosed={() => moreMenu?.focus()}
  onHtmlClosed={() => moreMenu?.focus()}
/>
<FocusSheetHost
  bind:this={focusSheetHost}
  {focus}
  pictures={slideshow.pictures}
  search={focusSearch}
  passPaused={focusPaused}
  onServer={storage?.kind === "server"}
  {onEdit}
  {onLookAgain}
/>

<DeleteFlow
  bind:this={deleteFlow}
  title={slideshow.title}
  pictureCount={slideshow.pictures.length}
  onServer={storage?.kind === "server"}
  {onDelete}
  onKept={() => moreMenu?.focus()}
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
  /* Below a desktop the info panel stacks over the pictures instead of squeezing them. */
  @container (max-width: 1024px) {
    .detail {
      grid-template-columns: 1fr;
    }
    .detail > :global(.panel) {
      order: -1;
    }
  }
  @container (max-width: 720px) {
    /* A container query styles descendants only: the bar and the content inherit this. */
    .screen > :global(*) {
      --selection-bar-inset: 10px;
    }
  }
</style>
