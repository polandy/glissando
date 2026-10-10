<script lang="ts">
  import { onMount } from "svelte";
  import type { SlideshowStore, StoredSlideshow } from "../../library/stored-slideshow";
  import Dialog, { type DialogAction } from "../components/Dialog.svelte";
  import { getTranslator } from "../i18n/context";
  import { keepCopySheet, saveOnServerSheet, type CopySheet } from "../server-library/copy-sheet";

  /** The sheet confirming a copy between the device and the server before it runs. */
  let {
    action,
    stored,
    store,
    onKeepCopy,
    onSaveOnServer,
    onClose,
    onError,
  }: {
    action: "keepCopy" | "saveOnServer";
    stored: StoredSlideshow;
    /** Where the shown slideshow's music is read from, for its size. */
    store: Pick<SlideshowStore, "musicBlob">;
    onKeepCopy: (slideshow: StoredSlideshow) => void;
    onSaveOnServer: (slideshow: StoredSlideshow) => void;
    /** Answered either way. */
    onClose: () => void;
    onError: (error: unknown) => void;
  } = $props();

  const translator = getTranslator();
  const { t } = translator;

  let sheet = $state.raw<CopySheet | null>(null);

  // The sheet asks about the slideshow as it was when the menu item was chosen.
  onMount(() => {
    if (action === "keepCopy") {
      sheet = keepCopySheet(translator, stored);
      return;
    }
    const music = stored.music;
    const musicBytes =
      music === undefined
        ? Promise.resolve(null)
        : store.musicBlob(music.id).then((blob) => blob.size);
    musicBytes.then((bytes) => (sheet = saveOnServerSheet(translator, stored, bytes)), onError);
  });

  function confirm(): void {
    // Read before closing: closing lets the parent drop the action and the slideshow.
    const confirmed = { action, stored };
    onClose();
    if (confirmed.action === "keepCopy") onKeepCopy(confirmed.stored);
    else onSaveOnServer(confirmed.stored);
  }

  const actions = $derived.by((): DialogAction[] => {
    const cancel: DialogAction = { label: t("common.cancel"), tone: "ghost", onSelect: onClose };
    if (sheet?.confirm == null) return [cancel];
    const deviceOnly = sheet.fileNames.length > 0;
    return [
      cancel,
      { label: sheet.confirm, tone: deviceOnly ? "default" : "primary", onSelect: confirm },
    ];
  });
</script>

{#if sheet !== null}
  <Dialog title={sheet.title} message={sheet.message} {actions} onCancel={onClose}>
    {#snippet after()}
      {#if sheet !== null && sheet.fileNames.length > 0}
        <ul class="files">
          {#each sheet.fileNames as fileName, index (index)}
            <li>{fileName}</li>
          {/each}
        </ul>
      {/if}
      {#if sheet?.closing != null}
        <p class="closing">{sheet.closing}</p>
      {/if}
    {/snippet}
  </Dialog>
{/if}

<style>
  .files {
    margin: 6px 0;
    padding-left: 20px;
    font-family: var(--gl-font-mono);
    font-size: var(--gl-size-label);
    color: var(--gl-ink);
  }
  .closing {
    margin: 6px 0;
    color: var(--gl-muted);
    line-height: 1.5;
  }
</style>
