<script lang="ts">
  import { presetById } from "../../../../video-export";
  import Icon from "../../../components/Icon.svelte";
  import { getTranslator } from "../../../i18n/context";
  import type { ExportSheetState } from "../../../video-export/export-sheet-state";
  import FileRow from "../export-sheet/FileRow.svelte";
  import SavedNote from "../export-sheet/SavedNote.svelte";

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

<FileRow
  thumbnailUrl={coverUrl}
  name={view.file.name}
  facts={t("videoExport.fileFacts", {
    size: formatBytes(view.file.size),
    duration: formatDuration(durationSeconds),
    resolution: t("videoExport.resolution", {
      width: String(size.width),
      height: String(size.height),
    }),
  })}
/>
{#if view.delivery === "saved"}
  <SavedNote title={t("videoExport.savedTitle")} text={t("videoExport.savedText")} />
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
