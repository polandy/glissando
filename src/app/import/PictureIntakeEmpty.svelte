<script lang="ts">
  import Separator from "../components/Separator.svelte";
  import type { Snippet } from "svelte";
  import { getTranslator } from "../i18n/context";
  import DropZone from "./DropZone.svelte";

  /**
   * The pictures step before anything is picked: the drop zone and its sources, or, while adding
   * to a server slideshow, the sources alone (`dev-docs/server_library/IN_THE_APP.md`: no device
   * pictures for a server slideshow, unless `copyToAdd` turns them into a device copy's).
   */
  let {
    linking,
    copyToAdd = false,
    sources,
    onFiles,
    onError,
    onPickFiles,
    onPickFolder,
  }: {
    linking: boolean;
    /** Files from this device are taken for a device copy of the slideshow. */
    copyToAdd?: boolean;
    /** The boxes below the drop zone. */
    sources: Snippet;
    onFiles: (files: readonly File[]) => void;
    onError: (error: unknown) => void;
    onPickFiles: () => void;
    onPickFolder: () => void;
  } = $props();

  const { t } = getTranslator();
  let choosePictures: HTMLButtonElement | undefined = $state();

  /** The focus has nowhere of its own to go once the strip it led to empties. */
  export function focusChoose(): void {
    choosePictures?.focus();
  }
</script>

{#if linking}
  <div class="sources immich-first">{@render sources()}</div>
  {#if copyToAdd}
    <DropZone icon="image" {onFiles} {onError}>
      <b>{t("server.devicePictures")}</b>
      <small class="hint">{t("server.copyToAdd")}</small>
      <button bind:this={choosePictures} class="btn" type="button" onclick={onPickFiles}>
        {t("import.chooseFiles")}
      </button>
    </DropZone>
  {:else}
    <div class="device-off" aria-disabled="true">
      <b>{t("server.devicePictures")}</b>
      <small>{t("server.deviceDisabled")}</small>
    </div>
  {/if}
{:else}
  <DropZone icon="image" {onFiles} {onError}>
    <button bind:this={choosePictures} class="btn primary" type="button" onclick={onPickFiles}>
      {t("import.pickPictures")}
    </button>
    <span>
      {t("import.or")}
      <button class="btn ghost inline" type="button" onclick={onPickFolder}>
        {t("import.pickFolder")}
      </button><Separator />{t("import.dropHint")}
    </span>
    <span class="formats">{t("import.pictureFormats")}</span>
  </DropZone>
  <div class="sources">{@render sources()}</div>
{/if}

<style>
  .device-off {
    display: grid;
    justify-items: center;
    gap: 6px;
    padding: 28px 16px;
    border: 1.5px dashed var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
    text-align: center;
    opacity: 0.55;
  }
  .device-off small,
  .hint {
    max-width: 44ch;
    color: var(--gl-muted);
  }
  .sources {
    display: grid;
    gap: 10px;
  }
  .inline {
    height: auto;
    padding: 0 4px;
    font-size: inherit;
  }
  .formats {
    font-size: var(--gl-size-small);
    color: var(--gl-faint);
  }
</style>
