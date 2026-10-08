<script lang="ts">
  import { onDestroy } from "svelte";
  import Notice from "../components/Notice.svelte";
  import { getTranslator } from "../i18n/context";
  import Icon from "../components/Icon.svelte";
  import { browserObjectUrls, ObjectUrls } from "../media/object-urls";
  import DropZone from "./DropZone.svelte";
  import ImportFrame from "./ImportFrame.svelte";
  import type { ImportSession } from "./import-session";
  import { canContinue, captureRange, pendingPictureCount, picturesPhase } from "./import-view";

  let {
    session,
    loadThumbnail,
    onError,
    onLeave,
    onNext,
    onDiscard,
  }: {
    session: ImportSession;
    loadThumbnail: (pictureId: string) => Promise<Blob>;
    onError: (error: unknown) => void;
    /** Abbrechen and ←: the caller asks before throwing a selection away. */
    onLeave: () => void;
    onNext: () => void;
    /** Throws the selection away and stays on the step. */
    onDiscard: () => void;
  } = $props();

  const PICTURE_TYPES = "image/*";
  const { t, formatDate } = getTranslator();

  // The session and the loader are fixed for the step's lifetime.
  // svelte-ignore state_referenced_locally
  let importState = $state.raw(session.pictures.state);
  let urls = $state<ReadonlyMap<string, string>>(new Map());
  let pickFiles: HTMLInputElement;
  let pickFolder: HTMLInputElement;

  // svelte-ignore state_referenced_locally
  const thumbnails = new ObjectUrls({ ...browserObjectUrls, load: loadThumbnail, onError });
  onDestroy(() => thumbnails.dispose());

  $effect(() => session.pictures.subscribe((next) => (importState = next)));
  $effect(() => thumbnails.subscribe((next) => (urls = next)));
  $effect(() => thumbnails.sync(importState.pictures.map((picture) => picture.id)));

  const phase = $derived(picturesPhase(importState));
  const range = $derived(captureRange(importState.pictures));
  const pending = $derived(pendingPictureCount(importState));
  const skippedNames = $derived(importState.skipped.map((file) => file.fileName).join(", "));

  function add(files: readonly File[]): void {
    if (files.length > 0) {
      session.addPictures(files);
    }
  }

  function picked(event: Event & { currentTarget: HTMLInputElement }): void {
    add([...(event.currentTarget.files ?? [])]);
    // Cleared so that picking the same files again still reports a change.
    event.currentTarget.value = "";
  }

  function chooseFewer(): void {
    pickFiles.click();
    onDiscard();
  }
</script>

<input bind:this={pickFiles} type="file" accept={PICTURE_TYPES} multiple hidden onchange={picked} />
<input bind:this={pickFolder} type="file" webkitdirectory hidden onchange={picked} />

<ImportFrame step="pictures" onBack={onLeave}>
  <div>
    <h1 class="title">{t("import.picturesTitle")}</h1>
    <p class="lead">{t("import.picturesText")}</p>
  </div>

  {#if phase === "empty"}
    <DropZone icon="image" onFiles={add} {onError}>
      <button class="btn primary" type="button" onclick={() => pickFiles.click()}>
        {t("import.pickPictures")}
      </button>
      <span>
        {t("import.or")}
        <button class="btn ghost inline" type="button" onclick={() => pickFolder.click()}>
          {t("import.pickFolder")}
        </button>
        · {t("import.dropHint")}
      </span>
      <span class="formats">{t("import.pictureFormats")}</span>
    </DropZone>
  {/if}

  {#if importState.storageFull}
    <Notice tone="error">
      <b>{t("import.storageFull")}</b>
      {t("import.storageFullText")}
      <button class="link" type="button" onclick={chooseFewer}>{t("import.chooseFewer")}</button>
      {t("import.orDeleteOld")}
    </Notice>
  {/if}

  {#if phase === "importing" || (phase === "done" && range !== null)}
    <div class="progress">
      <div class="progress-row">
        {#if phase === "importing"}
          <span>
            <span class="mono">
              {t("import.progressCount", { done: importState.done, count: importState.total })}
            </span>
            {t("import.progressLabel", { count: importState.total })}
          </span>
          <button class="btn ghost" type="button" onclick={onDiscard}>
            {t("common.cancel")}
          </button>
        {:else if range !== null}
          <span>
            <b>{t("units.pictures", { count: importState.pictures.length })}</b>
            <span class="muted">
              · {t("import.dateRange", { from: formatDate(range.from), to: formatDate(range.to) })}
            </span>
          </span>
          <button class="btn ghost" type="button" onclick={() => pickFiles.click()}>
            <Icon name="plus" />{t("import.addMore")}
          </button>
        {/if}
      </div>
      <div class="meter">
        <i style:width="{importState.total > 0 ? (importState.done / importState.total) * 100 : 0}%"
        ></i>
      </div>
    </div>
  {/if}

  {#if !importState.busy && importState.skipped.length > 0}
    <Notice tone="warn">
      <b>{t("import.skipped", { count: importState.skipped.length })}</b>
      {t("import.skippedReason", { files: skippedNames })}
      {#if importState.pictures.length > 0}
        {t("import.skippedRest", { count: importState.pictures.length })}
      {/if}
    </Notice>
  {/if}

  {#if importState.pictures.length > 0 || pending > 0}
    <ul class="strip">
      {#each importState.pictures as picture (picture.id)}
        <li class="tile" class:pending={!urls.has(picture.id)}>
          {#if urls.has(picture.id)}
            <img src={urls.get(picture.id)} alt="" />
          {/if}
          <span class="date mono">{formatDate(picture.capturedAt)}</span>
        </li>
      {/each}
      {#each { length: pending }, index (index)}
        <li class="tile pending"></li>
      {/each}
    </ul>
  {/if}

  {#snippet actions()}
    <button class="btn ghost" type="button" onclick={onLeave}>{t("common.cancel")}</button>
    <button class="btn primary" type="button" disabled={!canContinue(importState)} onclick={onNext}>
      {t("common.next")}
    </button>
  {/snippet}
</ImportFrame>

<style>
  .inline {
    height: auto;
    padding: 0 4px;
    font-size: inherit;
  }
  .formats {
    font-size: var(--gl-size-small);
    color: var(--gl-faint);
  }
  .link {
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
  }
  .progress {
    display: grid;
    gap: 10px;
    padding: 14px 16px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
  }
  .progress-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  .meter {
    height: 6px;
    overflow: hidden;
    border-radius: 3px;
    background: var(--gl-hover);
  }
  .meter i {
    display: block;
    height: 100%;
    border-radius: 3px;
    background: var(--gl-mint);
    transition: width 0.3s;
  }
  .strip {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .tile {
    position: relative;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    border-radius: var(--gl-radius-tile);
  }
  .tile img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .date {
    position: absolute;
    z-index: 1;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 14px 7px 5px;
    background: linear-gradient(transparent, var(--gl-photo-fade));
    color: var(--gl-on-photo);
    font-weight: var(--gl-weight-medium);
    font-size: var(--gl-size-caption);
  }
  .tile.pending {
    background: var(--gl-hover);
  }
  .tile.pending::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(100deg, transparent 30%, var(--gl-scrim) 50%, transparent 70%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite linear;
  }
  @keyframes shimmer {
    to {
      background-position: -200% 0;
    }
  }
  @container (max-width: 720px) {
    .strip {
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .meter i {
      transition: none;
    }
    .tile.pending::after {
      animation: none;
    }
  }
</style>
