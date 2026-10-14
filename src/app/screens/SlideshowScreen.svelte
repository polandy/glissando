<script lang="ts">
  import { flushSync } from "svelte";
  import Header from "../components/Header.svelte";
  import { getTranslator } from "../i18n/context";
  import InfoPanel from "./slideshow/InfoPanel.svelte";
  import MoreMenu from "./slideshow/MoreMenu.svelte";
  import PicturesColumn from "./slideshow/PicturesColumn.svelte";
  import SelectionBar from "./slideshow/SelectionBar.svelte";
  import SlideshowEditSheets from "./slideshow/SlideshowEditSheets.svelte";
  import ExportSheets from "./slideshow/ExportSheets.svelte";
  import DeleteDialog from "./slideshow/DeleteDialog.svelte";
  import { endSelecting, NO_SELECTION, withoutRemoved } from "./slideshow/strip-selection";
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
    onMoveGroup,
    onRename,
    onEdit,
    onEditMusic,
    onTransition,
    onResetTransition,
    onPortraitPictures,
    onResetPortraitPictures,
    onEnsureOpeningCard,
    onOpeningCard,
    onRemoveOpeningCard,
    onEnsureClosingCard,
    onClosingCard,
    onRemoveClosingCard,
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
  }: SlideshowScreenProps = $props();

  const { t } = getTranslator();

  let confirmingDelete = $state(false);
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
  let picturesColumn = $state<PicturesColumn>();
  let editSheets = $state<SlideshowEditSheets>();
  let exportSheets = $state<ExportSheets>();

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
      <PicturesColumn
        bind:this={picturesColumn}
        {slideshow}
        {onPlay}
        {onAddPictures}
        {newPictureIds}
        bind:selection
        {mousePointer}
        {onEdit}
        {onRemove}
        onRemoveGroup={removeGroup}
        {onShiftGroup}
        {onMoveGroup}
        onOpenOpeningCard={() => editSheets?.openOpeningCard()}
        onOpenClosingCard={() => editSheets?.openClosingCard()}
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
        onSaveVideo={() => exportSheets?.openVideo()}
        onSaveWebPage={() => exportSheets?.openWebPage()}
        {onRename}
        {onEditMusic}
        onEditTransitions={() => editSheets?.openTransitions()}
        onEditPortraitPictures={() => editSheets?.openPortraitPictures()}
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

<SlideshowEditSheets
  bind:this={editSheets}
  {slideshow}
  {previewPorts}
  {reducedMotion}
  {onTransition}
  {onResetTransition}
  {onPortraitPictures}
  {onResetPortraitPictures}
  onTransitionsClosed={() => infoPanel?.focusTransitions()}
  onPortraitPicturesClosed={() => infoPanel?.focusPortraitPictures()}
  {onEnsureOpeningCard}
  {onOpeningCard}
  {onRemoveOpeningCard}
  onOpeningCardClosed={() => picturesColumn?.focusOpeningCard()}
  {onEnsureClosingCard}
  {onClosingCard}
  {onRemoveClosingCard}
  onClosingCardClosed={() => picturesColumn?.focusClosingCard()}
/>

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
