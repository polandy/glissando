<script lang="ts">
  import { pageSizeById } from "../../../../html-export/plan";
  import Icon from "../../../components/Icon.svelte";
  import { getTranslator } from "../../../i18n/context";
  import type { HtmlExportState } from "../../../html-export/html-export-state";
  import FileRow from "../export-sheet/FileRow.svelte";
  import SavedNote from "../export-sheet/SavedNote.svelte";

  /** The finished page, how it reaches the user, and "Open it". */
  let {
    view,
    durationSeconds,
    coverUrl,
    onOpen,
    onDeliver,
    onClose,
  }: {
    view: Extract<HtmlExportState, { readonly kind: "done" }>;
    durationSeconds: number;
    coverUrl: string;
    onOpen: () => void;
    onDeliver: () => void;
    onClose: () => void;
  } = $props();

  const { t, formatBytes, formatDuration } = getTranslator();
</script>

<FileRow
  thumbnailUrl={coverUrl}
  name={view.file.name}
  facts={t("htmlExport.fileFacts", {
    size: formatBytes(view.file.size),
    duration: formatDuration(durationSeconds),
    pixels: String(pageSizeById(view.sizeId).bound.longEdge),
  })}
/>
{#if view.delivery === "saved"}
  <SavedNote title={t("htmlExport.savedTitle")} text={t("htmlExport.savedText")} />
{:else}
  <p class="hint">
    {view.delivery === "share" ? t("htmlExport.shareHint") : t("htmlExport.downloadHint")}
  </p>
{/if}
<footer>
  <button class="btn" type="button" onclick={onOpen}>
    <Icon name="newTab" />{t("htmlExport.open")}
  </button>
  {#if view.delivery === "saved"}
    <button class="btn primary" type="button" onclick={onClose}>{t("htmlExport.finish")}</button>
  {:else}
    <button class="btn ghost" type="button" onclick={onClose}>{t("common.close")}</button>
    <button class="btn primary" type="button" onclick={onDeliver}>
      {#if view.delivery === "share"}
        <Icon name="share" />{t("htmlExport.share")}
      {:else}
        <Icon name="download" />{t("htmlExport.download")}
      {/if}
    </button>
  {/if}
</footer>
