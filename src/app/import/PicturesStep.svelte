<script lang="ts">
  import type { ImmichAvailabilityState } from "../../immich/immich-availability";
  import ImmichBox from "../immich/ImmichBox.svelte";
  import { getTranslator } from "../i18n/context";
  import GlissandoFilePicker from "../glissando-file/GlissandoFilePicker.svelte";
  import OpenFileBox from "../glissando-file/OpenFileBox.svelte";
  import type { OpenNotice as OpenNoticeModel } from "../glissando-file/open-flow";
  import OpenNotice from "../glissando-file/OpenNotice.svelte";
  import { singleGlissandoFile } from "./dropped-files";
  import ImportFrame from "./ImportFrame.svelte";
  import type { ImportSession } from "./import-session";
  import { canContinue } from "./import-view";
  import PictureIntakeBody from "./PictureIntakeBody.svelte";

  let {
    session,
    loadThumbnail,
    onError,
    onLeave,
    onNext,
    onDiscard,
    onOpenFile,
    notice,
    onDismissNotice,
    onReload,
    immich,
    onOpenImmich,
    onImmichSettings,
  }: {
    session: ImportSession;
    loadThumbnail: (pictureId: string) => Promise<Blob>;
    onError: (error: unknown) => void;
    /** Abbrechen and ←: the caller asks before throwing a selection away. */
    onLeave: () => void;
    onNext: () => void;
    /** Throws the selection away and stays on the step. */
    onDiscard: () => void;
    /** A .glissando file was chosen or dropped. */
    onOpenFile: (file: File) => void;
    /** Why the last file opened from here was refused. */
    notice: OpenNoticeModel | null;
    onDismissNotice: () => void;
    onReload: () => void;
    immich: ImmichAvailabilityState;
    onOpenImmich: () => void;
    /** An Immich problem's details are in the settings. */
    onImmichSettings: () => void;
  } = $props();

  const { t } = getTranslator();

  // The session is fixed for the step's lifetime.
  // svelte-ignore state_referenced_locally
  let importState = $state.raw(session.pictures.state);
  let pickGlissando: GlissandoFilePicker;

  $effect(() => session.pictures.subscribe((next) => (importState = next)));

  function add(files: readonly File[]): void {
    const glissandoFile = singleGlissandoFile(files);
    if (glissandoFile !== null) {
      onOpenFile(glissandoFile);
    } else if (files.length > 0) {
      session.addPictures(files);
    }
  }
</script>

<GlissandoFilePicker bind:this={pickGlissando} onFile={onOpenFile} />

<ImportFrame step="pictures" onBack={onLeave}>
  {#if notice !== null}
    <OpenNotice
      {notice}
      onPick={() => pickGlissando.pick()}
      {onReload}
      onDismiss={onDismissNotice}
    />
  {/if}
  <div>
    <h1 class="title">{t("import.picturesTitle")}</h1>
    <p class="lead">{t("import.picturesText")}</p>
  </div>

  <PictureIntakeBody
    intake={session.intake}
    {loadThumbnail}
    {onError}
    onFiles={add}
    {onDiscard}
    {immich}
    {onOpenImmich}
    duplicates="chosenTwice"
  >
    {#snippet sources()}
      <ImmichBox state={immich} onOpen={onOpenImmich} onSettings={onImmichSettings} />
      <OpenFileBox onPick={() => pickGlissando.pick()} />
    {/snippet}
  </PictureIntakeBody>

  {#snippet actions()}
    <button class="btn ghost" type="button" onclick={onLeave}>{t("common.cancel")}</button>
    <button class="btn primary" type="button" disabled={!canContinue(importState)} onclick={onNext}>
      {t("common.next")}
    </button>
  {/snippet}
</ImportFrame>
