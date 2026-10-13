<script lang="ts">
  import Icon from "../../components/Icon.svelte";
  import { getTranslator } from "../../i18n/context";
  import type { SlideshowDetails, SlideshowStorage } from "../view-models";
  import ShareLinkControl from "../../share-link/ShareLinkControl.svelte";
  import type { ShareLinkSession } from "../../share-link/share-link-session";
  import InfoPanelRows from "./InfoPanelRows.svelte";
  import StorageRow from "./StorageRow.svelte";
  import SaveAsRow from "./SaveAsRow.svelte";
  import TitleEditor from "./TitleEditor.svelte";

  /**
   * Beside the pictures: the title (renamed in place), "Play", the "Save as" row (video, web
   * page), where it lives and its link, and the slideshow's facts (`InfoPanelRows`).
   */
  let {
    slideshow,
    onPlay,
    storage = null,
    shareLink = null,
    onSaveVideo,
    onSaveWebPage,
    onRename,
    onEditMusic,
    onEditTransitions,
    onEditPortraitPictures,
  }: {
    slideshow: SlideshowDetails;
    onPlay: () => void;
    /** Where the slideshow lives; null while the server library is off. */
    storage?: SlideshowStorage | null;
    /** A server slideshow's link; null for a device slideshow. */
    shareLink?: ShareLinkSession | null;
    /** Opens the video export sheet. */
    onSaveVideo: () => void;
    /** Opens the web page export sheet. */
    onSaveWebPage: () => void;
    onRename: (typed: string) => void;
    onEditMusic: () => void;
    /** Opens the sheet of the slideshow's default transition. */
    onEditTransitions: () => void;
    /** Opens the sheet of the slideshow's portrait pictures setting. */
    onEditPortraitPictures: () => void;
  } = $props();

  let rows: InfoPanelRows;
  let saveAs: SaveAsRow;

  /** The video export sheet closed: focus goes back to its button. */
  export function focusSaveVideo(): void {
    saveAs.focusVideo();
  }

  /** The web page export sheet closed: focus goes back to its button. */
  export function focusSaveWebPage(): void {
    saveAs.focusWebPage();
  }

  /** The transitions sheet closed: focus goes back to the row it was opened from. */
  export function focusTransitions(): void {
    rows.focusTransitions();
  }

  /** The portrait pictures sheet closed: focus goes back to the row it was opened from. */
  export function focusPortraitPictures(): void {
    rows.focusPortraitPictures();
  }

  const { t, formatDate } = getTranslator();

  const dateRange = $derived.by(() => {
    const from = formatDate(slideshow.capturedFrom);
    const to = formatDate(slideshow.capturedTo);
    return from === to ? from : t("slideshow.dateRange", { from, to });
  });
</script>

<aside class="panel">
  <div>
    <div class="eyebrow">{t("slideshow.eyebrow")}</div>
    <TitleEditor title={slideshow.title} {onRename} />
    <div class="muted mono range">{dateRange}</div>
  </div>
  <div class="actions">
    <button class="btn primary large" type="button" onclick={onPlay}>
      <Icon name="play" />{t("slideshow.play")}
    </button>
    <SaveAsRow bind:this={saveAs} {onSaveVideo} {onSaveWebPage} />
    {#if storage !== null}
      <StorageRow {storage} />
      {#if storage.kind === "device" || shareLink !== null}
        <ShareLinkControl
          session={storage.kind === "server" ? shareLink : null}
          subject={{
            title: slideshow.title,
            pictureCount: slideshow.pictures.length,
            durationSeconds: slideshow.durationSeconds,
            hasMusic: slideshow.songCount > 0,
          }}
        />
      {/if}
    {/if}
  </div>
  <InfoPanelRows
    bind:this={rows}
    {slideshow}
    {onEditMusic}
    {onEditTransitions}
    {onEditPortraitPictures}
  />
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
  .actions {
    display: grid;
    gap: 10px;
  }
  .range {
    margin-top: 4px;
    font-size: var(--gl-size-meta);
  }
</style>
