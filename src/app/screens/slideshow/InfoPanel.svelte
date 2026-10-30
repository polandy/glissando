<script lang="ts">
  import Icon from "../../components/Icon.svelte";
  import { getTranslator } from "../../i18n/context";
  import type { SlideshowDetails, SlideshowStorage } from "../view-models";
  import type { ServerSlideshowRows } from "../../server-library/server-slideshow-sessions";
  import DetailsTiles from "./DetailsTiles.svelte";
  import type { FineSettingsFoldStore } from "./fine-settings-fold";
  import FineSettings from "./FineSettings.svelte";
  import type { MoodEnergyPacing } from "./mood-energy-pacing";
  import TitleEditor from "./TitleEditor.svelte";

  /**
   * Beside the pictures: the title (renamed in place), the Music/Mood/Look tiles
   * (`DetailsTiles`, never folded) and "Fine settings" (`FineSettings`, folded by default,
   * ADR-0048).
   */
  let {
    slideshow,
    storage = null,
    serverRows = null,
    onRename,
    onShare,
    onEditMusic,
    onEditTransitions,
    onEditLook,
    moodBpm,
    moodEnergyPacing,
    onEditMood,
    onEditPortraitPictures,
    onEditChapters,
    fineSettingsFold,
  }: {
    slideshow: SlideshowDetails;
    /** Where the slideshow lives; null while the server library is off. */
    storage?: SlideshowStorage | null;
    /** A server slideshow's link and "Show on TV"; null for a device slideshow. */
    serverRows?: ServerSlideshowRows | null;
    onRename: (typed: string) => void;
    /** Opens the Share sheet. */
    onShare: () => void;
    onEditMusic: () => void;
    /** Opens the sheet of the slideshow's default transition. */
    onEditTransitions: () => void;
    /** Opens the sheet of the slideshow's colour grade (ADR-0044). */
    onEditLook: () => void;
    /** The slideshow's tempo under its mood (ADR-0045); undefined without one. */
    moodBpm: number | undefined;
    /** The Mood tile's picture-times range under the energy pacing (ADR-0046); null without one. */
    moodEnergyPacing: MoodEnergyPacing | null;
    /** Opens the Mood sheet. */
    onEditMood: () => void;
    /** Opens the sheet of the slideshow's portrait pictures setting. */
    onEditPortraitPictures: () => void;
    /** Opens the trip chapters sheet in general mode (TRIP_CHAPTERS.md). */
    onEditChapters: () => void;
    /** Whether the "Fine settings" fold is open, kept on this device (ADR-0048). */
    fineSettingsFold: FineSettingsFoldStore;
  } = $props();

  let shareButton = $state<HTMLButtonElement>();
  let tiles: DetailsTiles;
  let fineSettings: FineSettings;

  /** The Share sheet closed: focus goes back to the button it was opened from. */
  export function focusShare(): void {
    shareButton?.focus();
  }

  /** The look sheet closed: focus goes back to the tile it was opened from. */
  export function focusLook(): void {
    tiles.focusLook();
  }

  /** The Mood sheet closed: focus goes back to the tile it was opened from. */
  export function focusMood(): void {
    tiles.focusMood();
  }

  /** The transitions sheet closed: focus goes back to the row it was opened from. */
  export function focusTransitions(): void {
    fineSettings.focusTransitions();
  }

  /** The portrait pictures sheet closed: focus goes back to the row it was opened from. */
  export function focusPortraitPictures(): void {
    fineSettings.focusPortraitPictures();
  }

  /** The chapters sheet closed: focus goes back to the row it was opened from. */
  export function focusChapters(): void {
    fineSettings.focusChapters();
  }

  const { t, formatDate, formatDuration } = getTranslator();

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
      <TitleEditor title={slideshow.title} {onRename}>
        {#snippet actions()}
          <button bind:this={shareButton} class="btn small share" type="button" onclick={onShare}>
            <Icon name="share" />{t("share.button")}
          </button>
        {/snippet}
      </TitleEditor>
      <div class="muted range">
        <span class="mono">{dateRange}</span><span class="summary">{` · ${summary}`}</span>
      </div>
    </div>
  </div>
  <DetailsTiles
    bind:this={tiles}
    {slideshow}
    {moodBpm}
    {moodEnergyPacing}
    {onEditMusic}
    {onEditMood}
    {onEditLook}
  />
  <FineSettings
    bind:this={fineSettings}
    {slideshow}
    {fineSettingsFold}
    {storage}
    {serverRows}
    {onEditTransitions}
    {onEditPortraitPictures}
    {onEditChapters}
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
  .head {
    display: grid;
    gap: 16px;
  }
  .range {
    margin-top: 4px;
    font-size: var(--gl-size-meta);
  }
  .share {
    border-radius: var(--gl-radius-pill);
  }
  .summary {
    display: none;
  }
  @container (max-width: 1024px) {
    .summary {
      display: inline;
    }
  }
</style>
