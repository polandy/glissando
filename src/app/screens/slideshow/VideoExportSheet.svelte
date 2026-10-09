<script lang="ts">
  import { onMount } from "svelte";
  import { MILLISECONDS_PER_SECOND } from "../../../player";
  import { presetById } from "../../../video-export";
  import Icon from "../../components/Icon.svelte";
  import Notice from "../../components/Notice.svelte";
  import { getTranslator } from "../../i18n/context";
  import type { ExportPreview } from "../../video-export/slideshow-video-export";
  import type {
    ExportSheetState,
    VideoExportSession,
  } from "../../video-export/video-export-session";
  import ExportChoose from "./video-export/ExportChoose.svelte";
  import ExportDone from "./video-export/ExportDone.svelte";
  import ExportRunning from "./video-export/ExportRunning.svelte";

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
  let dialog: HTMLDialogElement;
  let running = $state<ExportRunning>();

  // The native modal dialog traps focus and makes the page behind it inert.
  onMount(() => {
    const stop = session.subscribe((next) => (view = next));
    session.onPreview = (frame) => running?.showPreview(frame);
    dialog.showModal();
    void session.open();
    return () => {
      stop();
      session.onPreview = null;
      session.close();
      dialog.close();
    };
  });

  function close(): void {
    session.close();
    onClose();
  }

  function cancel(event: Event): void {
    event.preventDefault();
    close();
  }

  // The sheet fills the dialog, so a click that lands on the dialog itself is on its backdrop.
  // A stray tap must not cancel an export or lose a finished file.
  function closeOnScrim(event: MouseEvent): void {
    if (event.target === dialog && view.kind !== "running" && view.kind !== "done") {
      close();
    }
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

<dialog
  bind:this={dialog}
  aria-labelledby="video-export-title"
  oncancel={cancel}
  onclick={closeOnScrim}
>
  <div class="sheet">
    <header>
      <div class="heading">
        <h2 id="video-export-title">{heading.title}</h2>
        {#if heading.subtitle !== null}<p>{heading.subtitle}</p>{/if}
      </div>
      <button
        class="icon-btn"
        type="button"
        title={view.kind === "running" ? t("common.cancel") : t("common.close")}
        aria-label={view.kind === "running" ? t("common.cancel") : t("common.close")}
        onclick={close}
      >
        <Icon name="close" />
      </button>
    </header>

    {#if view.kind === "probing"}
      <p class="hint">{t("videoExport.probing")}</p>
    {:else if view.kind === "choose"}
      <ExportChoose
        {view}
        estimate={(preset) => session.estimate(preset)}
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
          <small class="mono error">{view.error.message}</small>
        </Notice>
      {/if}
      <footer>
        <button
          class="btn"
          class:ghost={view.kind === "storage-full"}
          type="button"
          onclick={close}
        >
          {t("common.close")}
        </button>
        {#if view.kind === "storage-full"}
          <button class="btn primary" type="button" onclick={() => session.backToChoose()}>
            {t("videoExport.otherSize")}
          </button>
        {/if}
      </footer>
    {/if}
  </div>
</dialog>

<style>
  dialog {
    width: calc(100% - 40px);
    max-width: 520px;
    max-height: calc(100% - 48px);
    padding: 0;
    overflow: auto;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
    color: var(--gl-ink);
    box-shadow: var(--gl-shadow);
  }
  dialog::backdrop {
    background: var(--gl-backdrop);
  }
  .sheet {
    display: grid;
    gap: 16px;
    padding: 20px;
  }
  header {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }
  .heading {
    flex: 1;
    min-width: 0;
  }
  h2 {
    margin: 0;
    font-family: var(--gl-font-display);
    font-weight: var(--gl-weight-title);
    font-size: var(--gl-size-panel-title);
    letter-spacing: var(--gl-tracking-title);
    text-wrap: balance;
  }
  .heading p {
    margin: 4px 0 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-label);
  }
  .icon-btn {
    margin: -6px -8px 0 0;
  }
  b {
    font-weight: var(--gl-weight-semibold);
  }
  .error {
    display: block;
    margin-top: 6px;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
    overflow-wrap: anywhere;
  }
  /* Shared by the states' parts. */
  .sheet :global(.hint) {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
    line-height: 1.45;
  }
  .sheet :global(footer) {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }
  /* The dialog sits in the top layer, outside the screen's container, so the viewport decides;
     the app fills it, so this matches the screens' 720 px container queries. */
  @media (max-width: 720px) {
    dialog {
      inset: auto 0 0;
      width: auto;
      max-width: none;
      max-height: 92%;
      margin: 0;
      border-width: 1px 0 0;
      border-radius: var(--gl-radius-large) var(--gl-radius-large) 0 0;
    }
    .sheet {
      padding: 18px 16px calc(18px + env(safe-area-inset-bottom));
    }
    .sheet :global(footer .btn) {
      flex: 1;
    }
  }
</style>
