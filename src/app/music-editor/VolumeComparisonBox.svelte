<script lang="ts">
  import type { StoredSlideshow } from "../../library/stored-slideshow";
  import { getTranslator } from "../i18n/context";
  import type { SongsLoudnessStatus } from "./music-editor-view";
  import { songColour } from "./song-colour";
  import { volumeComparisonView } from "./volume-comparison-view";

  /**
   * The collapsible "Loudness of the songs" box under the list: each song's own loudness (the
   * grey line) against where it ends up once levelled and its own volume are applied, on one
   * axis (dev-docs/library/MUSIC.md "Loudness levelling and song volume").
   */
  let { slideshow, loudness }: { slideshow: StoredSlideshow; loudness: SongsLoudnessStatus } =
    $props();

  const { t, formatVolumeDb } = getTranslator();
  const rows = $derived(volumeComparisonView(slideshow, loudness));
</script>

<details class="box">
  <summary>
    <b>{t("music.volumeComparison")}</b>
    <span>{t("music.volumeComparisonHint")}</span>
  </summary>
  {#each rows as row (row.id)}
    <div class="row">
      <span class="number mono" style:background={songColour(row.number)}>{row.number}</span>
      <div class="bar">
        {#if row.measured}
          <b class="fill" style:width="{row.nowPercent}%" style:background={songColour(row.number)}
          ></b>
          <i class="original" style:left="{row.originalPercent}%"></i>
        {:else}
          <b class="fill measuring"></b>
        {/if}
      </div>
      <span class="state">
        {row.measured
          ? row.levelled
            ? t("music.volumeLevelled")
            : formatVolumeDb(row.ownDb)
          : t("music.volumeMeasuring")}
      </span>
    </div>
  {/each}
</details>

<style>
  .box {
    display: grid;
    gap: 8px;
    padding: 14px 16px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
  }
  summary {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    cursor: pointer;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
  summary b {
    color: var(--gl-ink);
  }
  .row {
    display: grid;
    grid-template-columns: 26px 1fr auto;
    align-items: center;
    gap: 10px;
    font-size: var(--gl-size-small);
  }
  .number {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    color: var(--gl-song-ink);
    font-weight: var(--gl-weight-semibold);
  }
  .bar {
    position: relative;
    height: 12px;
    border-radius: var(--gl-radius-small);
    background: var(--gl-hover);
    overflow: hidden;
  }
  .fill {
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: var(--gl-radius-small);
    transition: width 0.3s ease;
  }
  .fill.measuring {
    width: 100%;
    background-image: repeating-linear-gradient(135deg, var(--gl-line) 0 4px, transparent 4px 8px);
  }
  .original {
    position: absolute;
    top: -2px;
    bottom: -2px;
    width: 2px;
    margin-left: -1px;
    background: var(--gl-ink);
    opacity: 0.55;
  }
  .state {
    min-width: 5ch;
    color: var(--gl-muted);
    text-align: right;
  }
</style>
