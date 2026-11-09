<script lang="ts">
  import "./slideshow/selection-clearance.css";
  import { flushSync } from "svelte";
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
  import { provideSlideshowEditCommands } from "./slideshow/slideshow-edit-commands";
  import { SlideshowSheets, type OpenSheet } from "./slideshow/slideshow-sheets.svelte";
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
    onPlayFrom,
    pulsePlay = false,
    onAddPictures,
    newPictureIds = new Set(),
    onRemove,
    onShiftGroup,
    onRemoveGroup,
    onShuffle,
    onSortByDate,
    onMoveGroup,
    onRename,
    onEdit,
    loadPicture,
    onError,
    onEditMusic,
    moodBpm,
    moodBeats,
    moodPreviewPorts,
    editCommands,
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
    selection: storedSelection = $bindable(NO_SELECTION),
    holdScheduler = browserScheduler,
    frameScheduler = animationFrames,
    focus,
    focusSearch,
    focusPaused,
    onLookAgain,
  }: SlideshowScreenProps = $props();

  const { t } = getTranslator();
  // The route builds the commands once, for the screen's lifetime.
  // svelte-ignore state_referenced_locally
  provideSlideshowEditCommands(editCommands);

  let viewing = $state<string | null>(null);
  const order = $derived(slideshow.pictures.map((picture) => picture.id));
  const viewerEntryList = $derived(viewerEntries(slideshow.pictures, []));
  const viewerUrls = $derived(
    new Map(slideshow.pictures.map((picture) => [picture.id, picture.thumbnailUrl])),
  );
  // A selected picture that was removed meanwhile leaves no selection (and, unless "Select"
  // started it, leaves selecting several too), whatever removed it.
  const selection = $derived(withoutRemoved(storedSelection, order));
  const showBar = $derived(selection.ids.size > 0 || selection.several);

  /**
   * Removing every picture is refused (a toast explains why), keeping the selection; otherwise
   * the removed ids leave it at once, ahead of the pictures prop making the same trip back down.
   */
  function removeGroup(pictureIds: readonly string[]): void {
    onRemoveGroup(pictureIds);
    if (pictureIds.length < order.length) {
      const removed = new Set(pictureIds);
      storedSelection = withoutRemoved(
        selection,
        order.filter((id) => !removed.has(id)),
      );
    }
  }
  /** Inserts an added chapter before the picture (TRIP_CHAPTERS.md), then opens its sheet. */
  function insertAndOpenChapter(pictureId: string): void {
    chapterEditor?.insertChapter(pictureId);
    sheets.open({ kind: "chapter", anchorPictureId: pictureId });
  }
  let moreMenu = $state<MoreMenu>();
  let infoPanel = $state<InfoPanel>();
  let picturesColumn = $state<PicturesColumn>();
  const sheets = new SlideshowSheets(focusOpener);

  /** Hands focus back to the button, row or tile a closed sheet was opened from. */
  function focusOpener(closed: OpenSheet): void {
    // The modal dialog must be gone first: until then the page behind it is inert.
    flushSync();
    switch (closed.kind) {
      case "transitions":
        return infoPanel?.focusTransitions();
      case "look":
        return infoPanel?.focusLook();
      case "mood":
        return infoPanel?.focusMood();
      case "portraitPictures":
        return infoPanel?.focusPortraitPictures();
      case "share":
        return infoPanel?.focusShare();
      case "openingCard":
        return picturesColumn?.focusOpeningCard();
      case "closingCard":
        return picturesColumn?.focusClosingCard();
      case "chapter":
        return picturesColumn?.focusChapter(closed.anchorPictureId);
      case "focus":
      case "delete":
        return moreMenu?.focus();
    }
  }
</script>

<div
  class="screen slideshow-screen"
  class:selecting={showBar}
  data-testid="editing-screen"
  aria-busy={saving}
>
  <Header crumbs={[t("start.library"), slideshow.title]} {onBack}>
    {#snippet actions()}
      <MoreMenu
        bind:this={moreMenu}
        onDelete={() => sheets.open({ kind: "delete" })}
        {storage}
        pictureCount={slideshow.pictures.length}
        {onStorageAction}
        focusFailed={slideshowFocusFailed(focus, slideshow.pictures, focusSearch, focusPaused)}
        onFocus={() => sheets.open({ kind: "focus" })}
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
        bind:selection={() => selection, (next) => (storedSelection = next)}
        {mousePointer}
        {onEdit}
        onView={(pictureId) => (viewing = pictureId)}
        onRemoveGroup={removeGroup}
        {onShuffle}
        {onSortByDate}
        {onShiftGroup}
        {onMoveGroup}
        onOpenOpeningCard={() => sheets.open({ kind: "openingCard" })}
        onOpenClosingCard={() => sheets.open({ kind: "closingCard" })}
        onOpenChapter={(anchorPictureId) => sheets.open({ kind: "chapter", anchorPictureId })}
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
        onShare={() => sheets.open({ kind: "share" })}
        {onEditMusic}
        onEditTransitions={() => sheets.open({ kind: "transitions" })}
        onEditLook={() => sheets.open({ kind: "look" })}
        onEditMood={() => sheets.open({ kind: "mood" })}
        onEditPortraitPictures={() => sheets.open({ kind: "portraitPictures" })}
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
      {onPlayFrom}
      onDone={() => (storedSelection = endSelecting())}
      onInsertChapter={insertAndOpenChapter}
      {onMoveGroup}
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
    {onPlayFrom}
    onRemove={slideshow.pictures.length > 1 ? onRemove : undefined}
    onClose={(pictureId) => {
      viewing = null;
      if (!selection.several && selection.ids.size === 1) {
        storedSelection = soleSelection(pictureId);
      }
    }}
  />
{/if}

<SlideshowEditSheets
  {sheets}
  {slideshow}
  {previewPorts}
  {reducedMotion}
  {moodPreviewPorts}
  {moodBpm}
  {moodBeats}
  {chapterEditor}
/>

<SlideshowScreenOverlays
  {sheets}
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
/>

<style>
  .detail {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 24px;
    align-items: start;
  }
  /* Below a desktop the info panel stacks under the play preview instead of squeezing the
     pictures (PicturesColumn dissolves its wrapper to order its parts around the panel). */
  @container (max-width: 1024px) {
    .detail {
      grid-template-columns: 1fr;
      gap: 8px;
    }
  }
</style>
