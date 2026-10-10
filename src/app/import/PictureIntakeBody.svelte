<script lang="ts">
  import { flushSync, onDestroy, type Snippet } from "svelte";
  import type { ImmichAvailabilityState } from "../../immich/immich-availability";
  import type { DuplicateReason } from "../../import/picture-import";
  import Icon from "../components/Icon.svelte";
  import Notice from "../components/Notice.svelte";
  import { getTranslator } from "../i18n/context";
  import type { MessageKey } from "../i18n/messages";
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
    sources,
    linking = false,
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
    /** The boxes below the drop zone. */
    sources: Snippet;
    /**
     * A server slideshow's pictures: linked from Immich, whose box comes first, none from the
     * device (`dev-docs/SERVER_LIBRARY.md`, Where a new slideshow lives).
     */
    linking?: boolean;
  } = $props();

  const PICTURE_TYPES = "image/*";
  const DUPLICATE_REASONS: readonly DuplicateReason[] = ["alreadyIn", "chosenTwice"];
  const DUPLICATE_LEADS = {
    alreadyIn: "add.alreadyIn",
    chosenTwice: "add.chosenTwice",
  } as const satisfies Record<DuplicateReason, MessageKey>;
  const FILE_NAME_SEPARATOR = ", ";
  const REMOVE_KEYS: ReadonlySet<string> = new Set(["Delete", "Backspace"]);
  const { t, formatDate } = getTranslator();

  // The intake and the loader are fixed for the body's lifetime.
  // svelte-ignore state_referenced_locally
  let importState = $state.raw(intake.pictures.state);
  let urls = $state<ReadonlyMap<string, string>>(new Map());
  let pickFiles: HTMLInputElement;
  let pickFolder: HTMLInputElement;
  let strip: HTMLUListElement | undefined = $state();
  let choosePictures: HTMLButtonElement | undefined = $state();

  // svelte-ignore state_referenced_locally
  const thumbnails = new ObjectUrls({ ...browserObjectUrls, load: loadThumbnail, onError });
  onDestroy(() => thumbnails.dispose());
  // Leaving the step makes the removals final.
  onDestroy(() => intake.endRemovals());

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

  /** Focus goes to the next picture's remove button, the previous one at the end, else Choose. */
  function remove(index: number, pictureId: string): void {
    intake.removePicture(pictureId);
    flushSync();
    const buttons = strip?.querySelectorAll<HTMLButtonElement>("button.remove") ?? [];
    (buttons[Math.min(index, buttons.length - 1)] ?? choosePictures)?.focus();
  }

  function removeOnKey(event: KeyboardEvent, index: number, pictureId: string): void {
    if (REMOVE_KEYS.has(event.key)) {
      event.preventDefault();
      remove(index, pictureId);
    }
  }

  function chooseFewer(): void {
    pickFiles.click();
    onDiscard();
  }
</script>

<input bind:this={pickFiles} type="file" accept={PICTURE_TYPES} multiple hidden onchange={picked} />
<input bind:this={pickFolder} type="file" webkitdirectory hidden onchange={picked} />

{#if phase === "empty" && linking}
  <div class="sources immich-first">{@render sources()}</div>
  <div class="device-off" aria-disabled="true">
    <b>{t("server.devicePictures")}</b>
    <small>{t("server.deviceDisabled")}</small>
  </div>
{:else if phase === "empty"}
  <DropZone icon="image" onFiles={(files) => onFiles(files)} {onError}>
    <button
      bind:this={choosePictures}
      class="btn primary"
      type="button"
      onclick={() => pickFiles.click()}
    >
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
    onAddMore={linking ? null : () => pickFiles.click()}
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

{#if !importState.busy}
  {#each DUPLICATE_REASONS as reason (reason)}
    {@const names = skipped[reason]}
    {#if names.length > 0}
      <Notice tone="warn">
        <b>{t(DUPLICATE_LEADS[reason], { count: names.length })}</b>
        {t("import.skippedFiles", { files: names.join(FILE_NAME_SEPARATOR) })}
        {#snippet actions()}
          {#if !linking}
            <button class="btn small" type="button" onclick={() => intake.addDuplicates(reason)}>
              {t("add.addAnyway")}
            </button>
          {/if}
        {/snippet}
      </Notice>
    {/if}
  {/each}
{/if}

{#if importState.pictures.length > 0 || pending > 0}
  <ul class="strip" bind:this={strip}>
    {#each importState.pictures as picture, index (picture.id)}
      <li class="tile" class:pending={!urls.has(picture.id)}>
        {#if urls.has(picture.id)}
          <img src={urls.get(picture.id)} alt="" />
        {/if}
        <span class="date mono">{formatDate(picture.capturedAt)}</span>
        <button
          class="remove"
          type="button"
          aria-label={t("import.removePicture", { date: formatDate(picture.capturedAt) })}
          title={t("slideshow.remove")}
          onclick={() => remove(index, picture.id)}
          onkeydown={(event) => removeOnKey(event, index, picture.id)}
        >
          <Icon name="close" />
        </button>
      </li>
    {/each}
    {#each { length: pending }, index (index)}
      <li class="tile pending"></li>
    {/each}
  </ul>
{/if}

{#if linking && importState.pictures.length > 0}
  <Notice tone="mint">{t("server.linked")}</Notice>
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
  .device-off small {
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
  /* Always shown for touch, which has no other way to remove; a mouse sees it on hover. */
  .remove {
    position: absolute;
    top: 5px;
    right: 5px;
    z-index: 2;
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    padding: 0;
    border: 0;
    border-radius: var(--gl-radius-small);
    background: var(--gl-photo-badge);
    color: var(--gl-on-photo);
    backdrop-filter: blur(6px);
    cursor: pointer;
    --gl-icon-size: var(--gl-size-icon-small);
  }
  /* A touch target of 44 px around the 26 px mark. */
  .remove::before {
    content: "";
    position: absolute;
    inset: -9px;
  }
  .remove:hover {
    background: var(--gl-coral);
    color: var(--gl-coral-ink);
  }
  @media (hover: hover) and (pointer: fine) {
    .remove {
      opacity: 0;
      transition: opacity 0.12s;
    }
    .tile:hover .remove,
    .remove:focus-visible {
      opacity: 1;
    }
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
