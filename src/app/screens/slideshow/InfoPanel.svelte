<script lang="ts">
  import Icon from "../../components/Icon.svelte";
  import { getTranslator } from "../../i18n/context";
  import type { SlideshowDetails, SlideshowStorage } from "../view-models";
  import ShareLinkControl from "../../share-link/ShareLinkControl.svelte";
  import type { ServerSlideshowRows } from "../../server-library/server-slideshow-sessions";
  import TvControl from "../../tv-remote/TvControl.svelte";
  import InfoPanelRows from "./InfoPanelRows.svelte";
  import StorageRow from "./StorageRow.svelte";
  import TitleEditor from "./TitleEditor.svelte";

  /**
   * Beside the pictures: the title (renamed in place), "Play", where it lives, its link and "Show on TV", and the slideshow's facts (`InfoPanelRows`).
   * Stacked above the pictures, only the head (title, summary, "Play") shows; "Details" opens
   * the rest.
   */
  let {
    slideshow,
    onPlay,
    storage = null,
    serverRows = null,
    onRename,
    onEditMusic,
    onEditTransitions,
    onEditLook,
    onEditPortraitPictures,
  }: {
    slideshow: SlideshowDetails;
    onPlay: () => void;
    /** Where the slideshow lives; null while the server library is off. */
    storage?: SlideshowStorage | null;
    /** A server slideshow's link and "Show on TV"; null for a device slideshow. */
    serverRows?: ServerSlideshowRows | null;
    onRename: (typed: string) => void;
    onEditMusic: () => void;
    /** Opens the sheet of the slideshow's default transition. */
    onEditTransitions: () => void;
    /** Opens the sheet of the slideshow's colour grade (ADR-0044). */
    onEditLook: () => void;
    /** Opens the sheet of the slideshow's portrait pictures setting. */
    onEditPortraitPictures: () => void;
  } = $props();

  let rows: InfoPanelRows;

  /** The transitions sheet closed: focus goes back to the row it was opened from. */
  export function focusTransitions(): void {
    rows.focusTransitions();
  }

  /** The look sheet closed: focus goes back to the row it was opened from. */
  export function focusLook(): void {
    rows.focusLook();
  }

  /** The portrait pictures sheet closed: focus goes back to the row it was opened from. */
  export function focusPortraitPictures(): void {
    rows.focusPortraitPictures();
  }

  const { t, formatDate, formatDuration } = getTranslator();

  let detailsOpen = $state(false);
  const detailsId = "slideshow-details";
  const summary = $derived(
    `${t("units.pictures", { count: slideshow.pictures.length })} · ${formatDuration(slideshow.durationSeconds)}`,
  );

  const dateRange = $derived.by(() => {
    const from = formatDate(slideshow.capturedFrom);
    const to = formatDate(slideshow.capturedTo);
    return from === to ? from : t("slideshow.dateRange", { from, to });
  });
</script>

<aside class="panel">
  <div class="head">
    <div class="identity">
      <div class="eyebrow">{t("slideshow.eyebrow")}</div>
      <TitleEditor title={slideshow.title} {onRename} />
      <div class="muted mono range">
        {dateRange}<span class="summary">{` · ${summary}`}</span>
      </div>
    </div>
    <button class="btn primary large play" type="button" onclick={onPlay}>
      <Icon name="play" />{t("slideshow.play")}
    </button>
  </div>
  <button
    class="toggle"
    type="button"
    aria-expanded={detailsOpen}
    aria-controls={detailsId}
    onclick={() => (detailsOpen = !detailsOpen)}
  >
    {t("slideshow.details")}
    <span class="chevron" class:open={detailsOpen}><Icon name="chevronRight" /></span>
  </button>
  <div class="more" class:open={detailsOpen} id={detailsId}>
    <div class="actions">
      {#if storage !== null}
        <StorageRow {storage} />
        {#if storage.kind === "device" || serverRows !== null}
          <ShareLinkControl
            session={storage.kind === "server" ? (serverRows?.shareLink ?? null) : null}
            subject={{
              title: slideshow.title,
              pictureCount: slideshow.pictures.length,
              durationSeconds: slideshow.durationSeconds,
              hasMusic: slideshow.songCount > 0,
            }}
          />
        {/if}
        {#if storage.kind === "server" && serverRows !== null}
          <TvControl session={serverRows.tv} />
        {/if}
      {/if}
    </div>
    <InfoPanelRows
      bind:this={rows}
      {slideshow}
      {onEditMusic}
      {onEditTransitions}
      {onEditLook}
      {onEditPortraitPictures}
    />
  </div>
</aside>

<style>
  .panel {
    display: grid;
    gap: 16px;
    padding: 18px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
  }
  .head {
    display: grid;
    gap: 16px;
  }
  .more {
    display: grid;
    gap: 16px;
  }
  .actions {
    display: grid;
    gap: 10px;
  }
  .range {
    margin-top: 4px;
    font-size: var(--gl-size-meta);
  }
  .summary {
    display: none;
  }
  .toggle {
    display: none;
    align-items: center;
    justify-content: space-between;
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    font-weight: var(--gl-weight-semibold);
    color: var(--gl-muted);
    cursor: pointer;
  }
  .chevron {
    display: inline-flex;
    transform: rotate(90deg);
  }
  .chevron.open {
    transform: rotate(-90deg);
  }
  @container (max-width: 1024px) {
    .head {
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
    }
    .summary {
      display: inline;
    }
    .toggle {
      display: flex;
    }
    .more:not(.open) {
      display: none;
    }
    .actions {
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      align-items: start;
    }
  }
</style>
