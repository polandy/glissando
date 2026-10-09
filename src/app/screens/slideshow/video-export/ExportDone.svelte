<script lang="ts">
  import { presetById } from "../../../../video-export";
  import Icon from "../../../components/Icon.svelte";
  import { getTranslator } from "../../../i18n/context";
  import type { ExportSheetState } from "../../../video-export/video-export-session";

  /** The finished file and how it reaches the user: saved, shared or downloaded. */
  let {
    view,
    durationSeconds,
    coverUrl,
    onDeliver,
    onClose,
  }: {
    view: Extract<ExportSheetState, { readonly kind: "done" }>;
    durationSeconds: number;
    coverUrl: string;
    onDeliver: () => void;
    onClose: () => void;
  } = $props();

  const { t, formatBytes, formatDuration } = getTranslator();
  const size = $derived(presetById(view.preset).size);
</script>

<div class="file">
  <img class="thumb" alt="" src={coverUrl} />
  <b>{view.file.name}</b>
  <small class="mono">
    {t("videoExport.fileFacts", {
      size: formatBytes(view.file.size),
      duration: formatDuration(durationSeconds),
      resolution: t("videoExport.resolution", {
        width: String(size.width),
        height: String(size.height),
      }),
    })}
  </small>
</div>
{#if view.delivery === "saved"}
  <p class="saved" role="status">
    <Icon name="check" /><span
      ><b>{t("videoExport.savedTitle")}</b>
      {t("videoExport.savedText")}</span
    >
  </p>
  <footer>
    <button class="btn primary" type="button" onclick={onClose}>{t("videoExport.finish")}</button>
  </footer>
{:else}
  <p class="hint">
    {view.delivery === "share" ? t("videoExport.shareHint") : t("videoExport.downloadHint")}
  </p>
  <footer>
    <button class="btn ghost" type="button" onclick={onClose}>{t("common.close")}</button>
    <button class="btn primary" type="button" onclick={onDeliver}>
      {#if view.delivery === "share"}
        <Icon name="share" />{t("videoExport.share")}
      {:else}
        <Icon name="download" />{t("videoExport.download")}
      {/if}
    </button>
  </footer>
{/if}

<style>
  .file {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 2px 12px;
    padding: 12px 14px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
    background: var(--gl-raised);
  }
  .thumb {
    grid-row: span 2;
    width: 64px;
    aspect-ratio: 16 / 9;
    border-radius: var(--gl-radius-small);
    object-fit: cover;
  }
  .file b {
    overflow: hidden;
    font-weight: var(--gl-weight-semibold);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .file small {
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
  .saved {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin: 0;
    padding: 11px 14px;
    border: 1px solid color-mix(in srgb, var(--gl-mint) 55%, var(--gl-line));
    border-radius: var(--gl-radius);
    background: color-mix(in srgb, var(--gl-mint) 18%, var(--gl-surface));
    line-height: 1.45;
  }
  .saved b {
    font-weight: var(--gl-weight-semibold);
  }
</style>
