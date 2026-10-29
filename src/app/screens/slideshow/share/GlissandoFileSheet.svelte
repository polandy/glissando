<script lang="ts">
  import Notice from "../../../components/Notice.svelte";
  import { getTranslator } from "../../../i18n/context";
  import { glissandoFileName } from "../../../../glissando-file/export-slideshow";
  import type { ExportMenuState } from "../../../glissando-file/export-menu";
  import type { ExportOutcome } from "../../../glissando-file/export-job";
  import type { ShareSubject } from "../../../share-link/ShareSheet.svelte";
  import ExportDialog from "../export-sheet/ExportDialog.svelte";
  import SavedNote from "../export-sheet/SavedNote.svelte";

  /**
   * "Glissando file" (library/GLISSANDO_FILE.md): what the file is, then Save file, which
   * starts the background export. The sheet shows its progress and how it ended; closing it
   * leaves the export running.
   */
  let {
    subject,
    exportState,
    onSave,
    onBack,
    onClose,
  }: {
    subject: ShareSubject;
    exportState: ExportMenuState;
    /** Starts the export and resolves with how it ended. */
    onSave: () => Promise<ExportOutcome>;
    onBack: () => void;
    onClose: () => void;
  } = $props();

  const PERCENT = 100;
  const { t, formatBytes } = getTranslator();

  /** How the export started from this sheet ended; null before one did. */
  let outcome = $state<ExportOutcome | null>(null);

  async function save(): Promise<void> {
    outcome = null;
    outcome = await onSave();
  }

  const fileName = $derived(glissandoFileName(subject.title));
  const facts = $derived(
    t(subject.hasMusic ? "glissandoFile.factsWithMusic" : "glissandoFile.factsWithoutMusic", {
      pictures: t("units.pictures", { count: subject.pictureCount }),
    }),
  );
  const percent = $derived(
    exportState.kind === "this" ? Math.round(exportState.fraction * PERCENT) : 0,
  );
</script>

<ExportDialog
  labelId="glissando-file-title"
  title={t("share.fileTitle")}
  subtitle={null}
  closeLabel={t("common.close")}
  closeOnScrim={exportState.kind !== "this"}
  {onClose}
  {onBack}
  backLabel={t("common.back")}
>
  {#if exportState.kind === "this"}
    <p class="hint">{t("glissandoFile.saving", { percent })}</p>
    <div
      class="meter"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax={PERCENT}
      aria-valuenow={percent}
    >
      <i style:width="{percent}%"></i>
    </div>
    <p class="hint">{t("glissandoFile.savingInBackground")}</p>
  {:else if outcome === "saved"}
    <SavedNote title={t("glissandoFile.saved")} text={fileName} />
    <footer>
      <button class="btn primary" type="button" onclick={onClose}>{t("share.done")}</button>
    </footer>
  {:else}
    {#if outcome === "failed"}
      <Notice tone="error">{t("glissandoFile.saveFailed")}</Notice>
    {:else}
      <p class="hint">{t("glissandoFile.sheetText")}</p>
    {/if}
    <div class="file">
      <b>{fileName}</b>
      <small>{facts}</small>
      {#if exportState.kind === "idle" && exportState.sizeBytes !== null}
        <span class="size mono">{formatBytes(exportState.sizeBytes)}</span>
      {/if}
    </div>
    {#if exportState.kind === "other"}
      <p class="hint">{t("glissandoFile.exportAfterRunning")}</p>
    {/if}
    <footer>
      <button
        class="btn primary"
        type="button"
        disabled={exportState.kind === "other"}
        onclick={() => void save()}
      >
        {outcome === "failed" ? t("glissandoFile.tryAgain") : t("glissandoFile.save")}
      </button>
    </footer>
  {/if}
</ExportDialog>

<style>
  .file {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 2px 12px;
    padding: 12px 14px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
    background: var(--gl-raised);
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
  .size {
    grid-row: span 2;
    grid-column: 2;
    align-self: center;
    color: var(--gl-muted);
    font-size: var(--gl-size-label);
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
</style>
