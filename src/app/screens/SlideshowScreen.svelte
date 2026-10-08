<script lang="ts">
  import { flushSync } from "svelte";
  import Dialog from "../components/Dialog.svelte";
  import Header from "../components/Header.svelte";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import InfoPanel from "./slideshow/InfoPanel.svelte";
  import MoreMenu from "./slideshow/MoreMenu.svelte";
  import PictureStrip from "./slideshow/PictureStrip.svelte";
  import SelectionBar from "./slideshow/SelectionBar.svelte";
  import type { SlideshowDetails } from "./view-models";

  let {
    slideshow,
    onBack,
    onPlay,
    onRemove,
    onMove,
    onRename,
    onDelete,
    mousePointer,
    saving,
  }: {
    slideshow: SlideshowDetails;
    onBack: () => void;
    onPlay: () => void;
    onRemove: (pictureId: string) => void;
    onMove: (pictureId: string, toIndex: number) => void;
    onRename: (typed: string) => void;
    /** The user confirmed deleting the whole slideshow. */
    onDelete: () => void;
    /** The primary pointer is a mouse (hovers, fine): tiles can be dragged. */
    mousePointer: boolean;
    /** An edit is being stored. */
    saving: boolean;
  } = $props();

  const { t, formatDuration } = getTranslator();

  let selectedId = $state<string | null>(null);
  let confirmingDelete = $state(false);
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
      <MoreMenu bind:this={moreMenu} onDelete={() => (confirmingDelete = true)} />
    {/snippet}
  </Header>
  <main class="content">
    <div class="detail">
      <div class="pictures">
        <button class="preview" type="button" aria-label={t("slideshow.play")} onclick={onPlay}>
          <img src={slideshow.coverUrl} alt="" />
          <span class="play"><Icon name="play" /></span>
          <span class="time mono">
            {t("player.time", {
              current: formatDuration(0),
              total: formatDuration(slideshow.durationSeconds),
            })}
          </span>
        </button>

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
          {onRemove}
          {onMove}
        />
      </div>

      <InfoPanel {slideshow} {onPlay} {onRename} />
    </div>
  </main>
  <!-- Inside the screen, so the container query narrows it with the layout. -->
  {#if selectedIndex >= 0}
    <SelectionBar
      index={selectedIndex}
      count={slideshow.pictures.length}
      onEarlier={() => moveSelected(-1)}
      onLater={() => moveSelected(1)}
      onRemove={removeSelected}
      onDone={() => (selectedId = null)}
    />
  {/if}
</div>

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
  .preview {
    position: relative;
    aspect-ratio: 16 / 9;
    padding: 0;
    overflow: hidden;
    border: 0;
    border-radius: var(--gl-radius-large);
    background: var(--gl-hover);
    cursor: pointer;
  }
  .preview img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .preview::after {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(120% 90% at 50% 40%, transparent 55%, var(--gl-photo-vignette));
  }
  .play {
    position: absolute;
    left: 50%;
    top: 50%;
    z-index: 1;
    display: grid;
    place-items: center;
    width: 64px;
    height: 64px;
    translate: -50% -50%;
    border-radius: 50%;
    background: var(--gl-photo-play-bg);
    color: var(--gl-photo-play-ink);
    box-shadow: var(--gl-photo-play-shadow);
    --gl-icon-size: var(--gl-size-icon-large);
  }
  /* The triangle's visual centre sits right of its box's centre. */
  .play :global(svg) {
    translate: 2px 0;
  }
  .time {
    position: absolute;
    left: 14px;
    bottom: 12px;
    z-index: 1;
    padding: 3px 8px;
    border-radius: var(--gl-radius-small);
    background: var(--gl-photo-badge);
    color: var(--gl-on-photo);
    font-size: var(--gl-size-small);
    backdrop-filter: blur(6px);
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
