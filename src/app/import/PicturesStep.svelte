<script lang="ts">
  import { onDestroy } from "svelte";
  import Notice from "../components/Notice.svelte";
  import { getTranslator } from "../i18n/context";
  import { ICONS } from "../icons";
  import { browserObjectUrls, ObjectUrls } from "../media/object-urls";
  import DropZone from "./DropZone.svelte";
  import ImportFrame from "./ImportFrame.svelte";
  import type { ImportSession } from "./import-session";
  import { canContinue, captureRange, picturesPhase } from "./import-view";

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
  <h1>{t("import.picturesTitle")}</h1>
  <p class="muted">{t("import.picturesText")}</p>

  {#if phase === "empty"}
    <DropZone icon={ICONS.pictures} onFiles={add} {onError}>
      <button class="btn primary" type="button" onclick={() => pickFiles.click()}>
        {t("import.pickPictures")}
      </button>
      <span class="muted">
        {t("import.or")}
        <button class="btn ghost inline" type="button" onclick={() => pickFolder.click()}>
          {t("import.pickFolder")}
        </button>
        · {t("import.dropHint")}
      </span>
      <span class="muted formats">{t("import.pictureFormats")}</span>
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

  {#if phase === "importing"}
    <div class="progress">
      <div class="progress-row">
        <span>{t("import.progress", { done: importState.done, count: importState.total })}</span>
        <button class="btn ghost inline" type="button" onclick={onDiscard}>
          {t("common.cancel")}
        </button>
      </div>
      <div class="bar"><i style:width="{(importState.done / importState.total) * 100}%"></i></div>
    </div>
  {/if}

  {#if phase === "done" && range !== null}
    <p class="summary">
      <b>{t("units.pictures", { count: importState.pictures.length })}</b>
      <span class="muted">
        · {t("import.dateRange", { from: formatDate(range.from), to: formatDate(range.to) })}
      </span>
      <button class="btn ghost inline" type="button" onclick={() => pickFiles.click()}>
        {t("import.addMore")}
      </button>
    </p>
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

  {#if importState.pictures.length > 0}
    <ul class="grid">
      {#each importState.pictures as picture (picture.id)}
        {@const date = formatDate(picture.capturedAt)}
        <li class="tile">
          {#if urls.has(picture.id)}
            <img src={urls.get(picture.id)} alt="" />
          {/if}
          <span class="caption">{date}</span>
        </li>
      {/each}
    </ul>
  {/if}

  {#snippet actions()}
    <button class="btn ghost" type="button" onclick={onLeave}>{t("common.cancel")}</button>
    <button class="btn primary" type="button" disabled={!canContinue(importState)} onclick={onNext}>
      {t("common.next")} <span aria-hidden="true">{ICONS.forward}</span>
    </button>
  {/snippet}
</ImportFrame>

<style>
  .inline {
    padding: 0 4px;
    font-size: inherit;
  }
  .formats {
    font-size: var(--gl-size-caption);
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
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 12px;
  }
  .progress-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }
  .bar {
    height: 10px;
    overflow: hidden;
    border-radius: 5px;
    background: var(--gl-line);
  }
  .bar i {
    display: block;
    height: 100%;
    background: var(--gl-mint);
    transition: width 0.2s;
  }
  .summary {
    margin-top: 14px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
    gap: 10px;
    margin: 12px 0 0;
    padding: 0;
    list-style: none;
  }
  @container (min-width: 700px) {
    .grid {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    }
  }
  .tile {
    position: relative;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    border-radius: var(--gl-radius-tile);
    background: var(--gl-surface);
    animation: pop 0.25s ease-out;
  }
  .tile img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .caption {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 14px 8px 5px;
    background: linear-gradient(transparent, var(--gl-caption-scrim));
    color: var(--gl-milk);
    font-size: var(--gl-size-caption);
  }
  @keyframes pop {
    from {
      transform: scale(0.9);
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .bar i {
      transition: none;
    }
    .tile {
      animation: none;
    }
  }
</style>
