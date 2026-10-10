<script lang="ts">
  import { getTranslator } from "../../../i18n/context";
  import type { HtmlExportState } from "../../../html-export/html-export-state";

  /** One thumbnail per picture, lit once it is in the page; the progress; only "Cancel". */
  let {
    view,
    thumbnailUrls,
    onCancel,
  }: {
    view: Extract<HtmlExportState, { readonly kind: "running" }>;
    thumbnailUrls: readonly string[];
    onCancel: () => void;
  } = $props();

  const { t, formatBytes } = getTranslator();
  const PERCENT = 100;
  const fraction = $derived(view.pictureCount === 0 ? 0 : view.picturesDone / view.pictureCount);
</script>

<div class="thumbs" aria-hidden="true">
  {#each thumbnailUrls as url, index (index)}
    <span class:done={index < view.picturesDone}><img alt="" src={url} /></span>
  {/each}
</div>
<div
  class="meter"
  role="progressbar"
  aria-valuemin="0"
  aria-valuemax={PERCENT}
  aria-valuenow={Math.round(fraction * PERCENT)}
>
  <i style:width="{fraction * PERCENT}%"></i>
</div>
<div class="row">
  <span>{t("htmlExport.pictures", { done: view.picturesDone, total: view.pictureCount })}</span>
  <span class="mono">{formatBytes(view.bytesWritten)}</span>
</div>
<footer>
  <button class="btn" type="button" onclick={onCancel}>{t("common.cancel")}</button>
</footer>

<style>
  .thumbs {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 4px;
    max-height: 220px;
    overflow: hidden;
  }
  .thumbs span {
    aspect-ratio: 3 / 2;
    overflow: hidden;
    border-radius: var(--gl-radius-small);
    background: var(--gl-hover);
  }
  .thumbs img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.35;
  }
  .thumbs .done img {
    opacity: 1;
  }
  .meter {
    height: 8px;
    overflow: hidden;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-hover);
  }
  .meter i {
    display: block;
    height: 100%;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-mint);
  }
  .row {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    color: var(--gl-muted);
    font-size: var(--gl-size-label);
    font-variant-numeric: tabular-nums;
  }
</style>
