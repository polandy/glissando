<script lang="ts">
  import { onMount } from "svelte";
  import { MILLISECONDS_PER_SECOND } from "../../../player";
  import { pageSizeById } from "../../../html-export/plan";
  import Notice from "../../components/Notice.svelte";
  import { getTranslator } from "../../i18n/context";
  import type { HtmlExportState } from "../../html-export/html-export-state";
  import type { HtmlExportSession } from "../../html-export/html-export-session";
  import ExportDialog from "./export-sheet/ExportDialog.svelte";
  import PageChoose from "./html-export/PageChoose.svelte";
  import PageDone from "./html-export/PageDone.svelte";
  import PageRunning from "./html-export/PageRunning.svelte";

  /**
   * "Save as web page" (dev-docs/HTML_EXPORT.md, Sheet): a dialog on desktop, a bottom sheet on
   * a phone. Closing it, Esc included, cancels a running export.
   */
  let {
    session,
    coverUrl,
    thumbnailUrls,
    onClose,
  }: {
    session: HtmlExportSession;
    /** The file row's thumbnail once the page is done: the first picture. */
    coverUrl: string;
    /** One per picture, in play order, lit while the export runs. */
    thumbnailUrls: readonly string[];
    onClose: () => void;
  } = $props();

  const { t, formatDuration } = getTranslator();

  // The session is fixed for the sheet's lifetime.
  // svelte-ignore state_referenced_locally
  const subject = session.subject;
  const durationSeconds = subject.durationMs / MILLISECONDS_PER_SECOND;

  // svelte-ignore state_referenced_locally
  let view = $state.raw<HtmlExportState>(session.state);

  onMount(() => {
    const stop = session.subscribe((next) => (view = next));
    void session.open();
    return () => {
      stop();
      session.close();
    };
  });

  function close(): void {
    session.close();
    onClose();
  }

  const heading = $derived.by(() => {
    switch (view.kind) {
      case "running":
        return {
          title: t("htmlExport.runningTitle"),
          subtitle: t("htmlExport.runningSubtitle", {
            size: t(`htmlExport.size-${view.sizeId}`),
            pixels: String(pageSizeById(view.sizeId).bound.longEdge),
          }),
        };
      case "done":
        return { title: t("htmlExport.doneTitle"), subtitle: null };
      case "failed":
        return { title: t("htmlExport.failedTitle"), subtitle: null };
      case "choose":
        return {
          title: t("htmlExport.title"),
          subtitle: t("htmlExport.subtitle", {
            title: subject.title,
            duration: formatDuration(durationSeconds),
            music: subject.withMusic ? t("htmlExport.withMusic") : t("htmlExport.withoutMusic"),
          }),
        };
    }
  });
</script>

<ExportDialog
  labelId="html-export-title"
  title={heading.title}
  subtitle={heading.subtitle}
  closeLabel={view.kind === "running" ? t("common.cancel") : t("common.close")}
  closeOnScrim={view.kind !== "running" && view.kind !== "done"}
  onClose={close}
>
  {#if view.kind === "choose"}
    <PageChoose
      {view}
      videoBytes={session.videoBytes}
      fromImmich={session.subject.picturesFromImmich}
      onSelect={(sizeId) => session.select(sizeId)}
      onStart={() => void session.start()}
      onCancel={close}
    />
  {:else if view.kind === "running"}
    <PageRunning {view} {thumbnailUrls} onCancel={close} />
  {:else if view.kind === "done"}
    <PageDone
      {view}
      {durationSeconds}
      {coverUrl}
      onOpen={() => session.openPage()}
      onDeliver={() => void session.deliver()}
      onClose={close}
    />
  {:else}
    <Notice tone="error">
      {t("htmlExport.failedText")}
      <small class="mono error-detail">{view.error.message}</small>
    </Notice>
    <footer>
      <button class="btn" type="button" onclick={close}>{t("common.close")}</button>
    </footer>
  {/if}
</ExportDialog>
