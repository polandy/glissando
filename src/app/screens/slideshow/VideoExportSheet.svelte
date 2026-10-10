<script lang="ts">
  import { onMount } from "svelte";
  import { MILLISECONDS_PER_SECOND } from "../../../player";
  import { presetById } from "../../../video-export";
  import Notice from "../../components/Notice.svelte";
  import { getTranslator } from "../../i18n/context";
  import type { ExportPreview } from "../../video-export/slideshow-video-export";
  import type { ExportSheetState } from "../../video-export/export-sheet-state";
  import type { VideoExportSession } from "../../video-export/video-export-session";
  import ExportChoose from "./video-export/ExportChoose.svelte";
  import ExportDone from "./video-export/ExportDone.svelte";
  import ExportRunning from "./video-export/ExportRunning.svelte";
  import ExportDialog from "./export-sheet/ExportDialog.svelte";

  /**
   * "Save as video" (dev-docs/VIDEO_EXPORT.md, Sheet): a dialog on desktop, a bottom sheet on a
   * phone. Closing it, Esc included, cancels a running export and discards a private file.
   */
  let {
    session,
    coverUrl,
    onClose,
  }: {
    session: VideoExportSession<ExportPreview>;
    /** The file row's thumbnail once the video is done. */
    coverUrl: string;
    onClose: () => void;
  } = $props();

  const { t, formatDuration, formatBytes } = getTranslator();

  // The session is fixed for the sheet's lifetime.
  // svelte-ignore state_referenced_locally
  const subject = session.subject;
  const durationSeconds = subject.durationMs / MILLISECONDS_PER_SECOND;

  // svelte-ignore state_referenced_locally
  let view = $state.raw<ExportSheetState>(session.state);
  let running = $state<ExportRunning>();

  onMount(() => {
    const stop = session.subscribe((next) => (view = next));
    session.onPreview = (frame) => running?.showPreview(frame);
    void session.open();
    return () => {
      stop();
      session.onPreview = null;
      session.close();
    };
  });

  function close(): void {
    session.close();
    onClose();
  }

  const heading = $derived.by(() => {
    switch (view.kind) {
      case "running": {
        const { size } = presetById(view.preset);
        return {
          title: t("videoExport.runningTitle"),
          subtitle: t("videoExport.runningSubtitle", {
            preset: t(`videoExport.preset-${view.preset}`),
            resolution: t("videoExport.resolution", {
              width: String(size.width),
              height: String(size.height),
            }),
          }),
        };
      }
      case "done":
        return { title: t("videoExport.doneTitle"), subtitle: null };
      case "storage-full":
      case "failed":
        return { title: t("videoExport.failedTitle"), subtitle: null };
      default:
        return {
          title: t("videoExport.title"),
          subtitle: t("videoExport.subtitle", {
            title: subject.title,
            duration: formatDuration(durationSeconds),
            music: subject.withMusic ? t("videoExport.withMusic") : t("videoExport.withoutMusic"),
          }),
        };
    }
  });
</script>

<ExportDialog
  labelId="video-export-title"
  title={heading.title}
  subtitle={heading.subtitle}
  closeLabel={view.kind === "running" ? t("common.cancel") : t("common.close")}
  closeOnScrim={view.kind !== "running" && view.kind !== "done"}
  onClose={close}
>
  {#if view.kind === "probing"}
    <p class="hint">{t("videoExport.probing")}</p>
  {:else if view.kind === "choose"}
    <ExportChoose
      {view}
      estimate={(preset) => session.estimate(preset)}
      fromImmich={session.subject.picturesFromImmich}
      onSelect={(preset) => session.select(preset)}
      onStart={() => void session.start()}
      onCancel={close}
    />
  {:else if view.kind === "running"}
    <ExportRunning bind:this={running} {view} {durationSeconds} onCancel={close} />
  {:else if view.kind === "done"}
    <ExportDone
      {view}
      {durationSeconds}
      {coverUrl}
      onDeliver={() => void session.deliver()}
      onClose={close}
    />
  {:else}
    {#if view.kind === "unsupported"}
      <Notice tone="warn">
        <b>{t("videoExport.unsupportedTitle")}</b>
        {t("videoExport.unsupportedText")}
      </Notice>
    {:else if view.kind === "storage-full"}
      <Notice tone="error">
        <b>{t("videoExport.storageFullTitle")}</b>
        {t("videoExport.storageFullText", {
          frame: view.frameReached,
          total: view.framesTotal,
          missing: formatBytes(view.missingBytes),
        })}
      </Notice>
    {:else}
      <Notice tone="error">
        {t("videoExport.failedText")}
        <small class="mono error-detail">{view.error.message}</small>
      </Notice>
    {/if}
    <footer>
      <button class="btn" class:ghost={view.kind === "storage-full"} type="button" onclick={close}>
        {t("common.close")}
      </button>
      {#if view.kind === "storage-full"}
        <button class="btn primary" type="button" onclick={() => session.backToChoose()}>
          {t("videoExport.otherSize")}
        </button>
      {/if}
    </footer>
  {/if}
</ExportDialog>
