<script lang="ts">
  import { onDestroy, type Snippet } from "svelte";
  import type { ImmichAvailabilityState } from "../../immich/immich-availability";
  import type { DuplicateReason } from "../../import/picture-import";
  import Notice from "../components/Notice.svelte";
  import { getTranslator } from "../i18n/context";
  import type { MessageKey } from "../i18n/messages";
  import { browserObjectUrls, ObjectUrls } from "../media/object-urls";
  import ChosenPicturesStrip from "./ChosenPicturesStrip.svelte";
  import DropZone from "./DropZone.svelte";
  import PictureViewer from "./PictureViewer.svelte";
  import PicturesProgress from "./PicturesProgress.svelte";
  import SetAsidePictures from "./SetAsidePictures.svelte";
  import type { PictureIntake } from "./picture-intake";
  import { viewerEntries } from "./picture-viewer-view";
  import {
    captureRange,
    longVideoCount,
    pendingPictureCount,
    picturesPhase,
    skippedNotices,
  } from "./import-view";
  import VideoNotices from "./VideoNotices.svelte";

  /**
   * The pictures step's body, for a new slideshow and for adding to one: the drop zone with the
   * sources below it, the progress, the notices and the tiles of what is taken in.
   */
  let {
    intake,
    loadThumbnail,
    loadPicture,
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
    /** A picture as the slideshow will show it, for the full-screen view. */
    loadPicture: (pictureId: string) => Promise<Blob>;
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
     * device (`dev-docs/server_library/IN_THE_APP.md`).
     */
    linking?: boolean;
  } = $props();

  const PICTURE_TYPES = "image/*,video/*,.mp4,.webm,.mov";
  const DUPLICATE_REASONS: readonly DuplicateReason[] = ["alreadyIn", "chosenTwice"];
  const DUPLICATE_LEADS = {
    alreadyIn: "add.alreadyIn",
    chosenTwice: "add.chosenTwice",
  } as const satisfies Record<DuplicateReason, MessageKey>;
  const FILE_NAME_SEPARATOR = ", ";
  const { t } = getTranslator();

  // The intake and the loader are fixed for the body's lifetime.
  // svelte-ignore state_referenced_locally
  let importState = $state.raw(intake.pictures.state);
  // svelte-ignore state_referenced_locally
  let cullingState = $state.raw(intake.culling.state);
  let urls = $state<ReadonlyMap<string, string>>(new Map());
  let pickFiles: HTMLInputElement;
  let pickFolder: HTMLInputElement;
  let choosePictures: HTMLButtonElement | undefined = $state();
  let strip: ReturnType<typeof ChosenPicturesStrip> | undefined = $state();
  let viewing: string | null = $state(null);

  // svelte-ignore state_referenced_locally
  const thumbnails = new ObjectUrls({ ...browserObjectUrls, load: loadThumbnail, onError });
  onDestroy(() => thumbnails.dispose());
  // Leaving the step makes the removals final.
  onDestroy(() => intake.endRemovals());

  $effect(() => intake.pictures.subscribe((next) => (importState = next)));
  $effect(() => intake.culling.subscribe((next) => (cullingState = next)));
  $effect(() => thumbnails.subscribe((next) => (urls = next)));
  $effect(() =>
    thumbnails.sync([
      ...importState.pictures.map((picture) => picture.id),
      ...cullingState.groups.flatMap((group) => group.pictures.map((picture) => picture.id)),
    ]),
  );

  const phase = $derived(picturesPhase(importState));
  const range = $derived(captureRange(importState.pictures));
  const pending = $derived(pendingPictureCount(importState));
  const skipped = $derived(skippedNotices(importState.skipped));
  const entries = $derived(viewerEntries(importState.pictures, cullingState.groups));

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

{#if phase === "importing" || cullingState.checking !== null || (phase === "done" && range !== null)}
  <PicturesProgress
    state={importState}
    checking={cullingState.checking}
    {range}
    onCancel={onDiscard}
    onAddMore={linking ? null : () => pickFiles.click()}
    onMoreFromImmich={immich.kind === "available" ? onOpenImmich : null}
  />
{/if}

{#if !importState.busy && (skipped.unreadable.length > 0 || skipped.undecodable.length > 0 || skipped.notDownloaded.length > 0)}
  <Notice tone="warn">
    {#if skipped.unreadable.length > 0}
      <b>{t("import.skipped", { count: skipped.unreadable.length })}</b>
      {t("import.skippedFiles", { files: skipped.unreadable.join(FILE_NAME_SEPARATOR) })}
    {/if}
    {#if skipped.undecodable.length > 0}
      <b>{t("import.undecodable", { count: skipped.undecodable.length })}</b>
      {t("import.skippedFiles", { files: skipped.undecodable.join(FILE_NAME_SEPARATOR) })}
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
  <ChosenPicturesStrip
    bind:this={strip}
    pictures={importState.pictures}
    {urls}
    {pending}
    onRemove={(pictureId) => intake.removePicture(pictureId)}
    onView={(pictureId) => (viewing = pictureId)}
    onEmptied={() => choosePictures?.focus()}
  />
{/if}

{#if !importState.busy}
  <VideoNotices refused={skipped.videosRefused} longCount={longVideoCount(importState.pictures)} />
{/if}

{#if cullingState.setAsideCount > 0}
  <SetAsidePictures
    groups={cullingState.groups}
    count={cullingState.setAsideCount}
    pictures={importState.pictures}
    {urls}
    onTakeIn={(pictureId) => intake.culling.takeIn(pictureId)}
    onTakeAllIn={() => intake.culling.takeAllIn()}
    onView={(pictureId) => (viewing = pictureId)}
    onEmptied={(pictureId) => strip?.focusRemove(pictureId)}
  />
{/if}

{#if viewing !== null}
  <PictureViewer
    {entries}
    pictureId={viewing}
    {urls}
    {loadPicture}
    {onError}
    onShow={(pictureId) => (viewing = pictureId)}
    onRemove={(pictureId) => intake.removePicture(pictureId)}
    onTakeIn={(pictureId) => intake.culling.takeIn(pictureId)}
    onClose={() => (viewing = null)}
  />
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
</style>
