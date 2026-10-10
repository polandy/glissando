<script lang="ts">
  import { onDestroy, type Snippet } from "svelte";
  import type { ImmichAvailabilityState } from "../../immich/immich-availability";
  import Notice from "../components/Notice.svelte";
  import { getTranslator } from "../i18n/context";
  import { browserObjectUrls, ObjectUrls } from "../media/object-urls";
  import DropZone from "./DropZone.svelte";
  import PicturesProgress from "./PicturesProgress.svelte";
  import type { PictureIntake } from "./picture-intake";
  import { captureRange, pendingPictureCount, picturesPhase, skippedNotices } from "./import-view";

  /**
   * The pictures step's body, for a new slideshow and for adding to one: the drop zone with the
   * sources below it, the progress, the notices and the tiles of what is taken in.
   */
  let {
    intake,
    loadThumbnail,
    onError,
    onFiles,
    onDiscard,
    immich,
    onOpenImmich,
    duplicates,
    sources,
  }: {
    intake: PictureIntake;
    loadThumbnail: (pictureId: string) => Promise<Blob>;
    onError: (error: unknown) => void;
    /** Files chosen or dropped; the caller decides what they are. */
    onFiles: (files: readonly File[]) => void;
    /** Throws the selection away and stays. */
    onDiscard: () => void;
    immich: ImmichAvailabilityState;
    onOpenImmich: () => void;
    /** How the duplicates notice names what they duplicate. */
    duplicates: "inSlideshow" | "chosenTwice";
    /** The boxes below the drop zone. */
    sources: Snippet;
  } = $props();

  const PICTURE_TYPES = "image/*";
  const FILE_NAME_SEPARATOR = ", ";
  const { t, formatDate } = getTranslator();

  // The intake and the loader are fixed for the body's lifetime.
  // svelte-ignore state_referenced_locally
  let importState = $state.raw(intake.pictures.state);
  let urls = $state<ReadonlyMap<string, string>>(new Map());
  let pickFiles: HTMLInputElement;
  let pickFolder: HTMLInputElement;

  // svelte-ignore state_referenced_locally
  const thumbnails = new ObjectUrls({ ...browserObjectUrls, load: loadThumbnail, onError });
  onDestroy(() => thumbnails.dispose());

  $effect(() => intake.pictures.subscribe((next) => (importState = next)));
  $effect(() => thumbnails.subscribe((next) => (urls = next)));
  $effect(() => thumbnails.sync(importState.pictures.map((picture) => picture.id)));

  const phase = $derived(picturesPhase(importState));
  const range = $derived(captureRange(importState.pictures));
  const pending = $derived(pendingPictureCount(importState));
  const skipped = $derived(skippedNotices(importState.skipped));

  function picked(event: Event & { currentTarget: HTMLInputElement }): void {
    onFiles([...(event.currentTarget.files ?? [])]);
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

{#if phase === "empty"}
  <DropZone icon="image" onFiles={(files) => onFiles(files)} {onError}>
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
  <div class="sources">{@render sources()}</div>
{/if}

{#if importState.storageFull}
  <Notice tone="error">
    <b>{t("import.storageFull")}</b>
    {t("import.storageFullText")}
    <button class="link" type="button" onclick={chooseFewer}>{t("import.chooseFewer")}</button>
    {t("import.orDeleteOld")}
  </Notice>
{/if}

{#if phase === "failed"}
  <Notice tone="error">
    <b>{t("import.failed")}</b>
    {t("import.failedText")}
    <button class="link" type="button" onclick={onDiscard}>{t("import.startOver")}</button>
    {t("import.startOverText")}
  </Notice>
{/if}

{#if phase === "importing" || (phase === "done" && range !== null)}
  <PicturesProgress
    state={importState}
    {range}
    onCancel={onDiscard}
    onAddMore={() => pickFiles.click()}
    onMoreFromImmich={immich.kind === "available" ? onOpenImmich : null}
  />
{/if}

{#if !importState.busy && (skipped.unreadable.length > 0 || skipped.notDownloaded.length > 0)}
  <Notice tone="warn">
    {#if skipped.unreadable.length > 0}
      <b>{t("import.skipped", { count: skipped.unreadable.length })}</b>
      {t("import.skippedFiles", { files: skipped.unreadable.join(FILE_NAME_SEPARATOR) })}
    {/if}
    {#if skipped.notDownloaded.length > 0}
      <b>{t("import.notDownloaded", { count: skipped.notDownloaded.length })}</b>
      {t("import.skippedFiles", { files: skipped.notDownloaded.join(FILE_NAME_SEPARATOR) })}
    {/if}
    {#if importState.pictures.length > 0}
      {t("import.skippedRest", { count: importState.pictures.length })}
    {/if}
  </Notice>
{/if}

{#if !importState.busy && skipped.duplicate.length > 0}
  {@const count = skipped.duplicate.length}
  <Notice tone="warn">
    <b>
      {duplicates === "inSlideshow"
        ? t("add.duplicatesInSlideshow", { count })
        : t("add.chosenTwice", { count })}
    </b>
    {t("import.skippedFiles", { files: skipped.duplicate.join(FILE_NAME_SEPARATOR) })}
    {#snippet actions()}
      <button class="btn small" type="button" onclick={() => intake.addDuplicates()}>
        {t("add.addAnyway")}
      </button>
    {/snippet}
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

<style>
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
  .link {
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
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
    .tile.pending::after {
      animation: none;
    }
  }
</style>
