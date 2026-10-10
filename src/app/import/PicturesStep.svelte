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
  import WhereItLives from "./WhereItLives.svelte";
  import type { SlideshowHome } from "../../server-library/server-library-memory";
  import { untrack } from "svelte";

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
    serverOn,
    rememberedHome,
    onHomeChosen,
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
    /** The server library is on: the step asks where the slideshow lives. */
    serverOn: boolean;
    /** Where this device put its last new slideshow. */
    rememberedHome: SlideshowHome;
    /** A home was chosen, to be remembered on this device. */
    onHomeChosen: (home: SlideshowHome) => void;
  } = $props();

  const { t } = getTranslator();

  // The session is fixed for the step's lifetime.
  // svelte-ignore state_referenced_locally
  let importState = $state.raw(session.pictures.state);
  let pickGlissando: GlissandoFilePicker;

  // svelte-ignore state_referenced_locally
  let home = $state<SlideshowHome>(session.choices.current().home);
  const locked = $derived(importState.pictures.length > 0 || importState.busy);

  $effect(() => session.pictures.subscribe((next) => (importState = next)));
  $effect(() => session.choices.subscribe((next) => (home = next.home)));
  // Without the server library a new slideshow lives on this device; a selection keeps its home.
  $effect(() => {
    const wanted = serverOn ? rememberedHome : "device";
    untrack(() => {
      if (!locked) session.chooseHome(wanted);
    });
  });

  function chooseHome(chosen: SlideshowHome): void {
    session.chooseHome(chosen);
    onHomeChosen(chosen);
  }

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

  {#if serverOn}
    <WhereItLives {home} {locked} onChoose={chooseHome} />
  {/if}

  <PictureIntakeBody
    linking={home === "server"}
    intake={session.intake}
    {loadThumbnail}
    {onError}
    onFiles={add}
    {onDiscard}
    {immich}
    {onOpenImmich}
  >
    {#snippet sources()}
      <ImmichBox
        state={immich}
        onOpen={onOpenImmich}
        onSettings={onImmichSettings}
        primary={home === "server"}
      />
      {#if home === "device"}
        <OpenFileBox onPick={() => pickGlissando.pick()} />
      {/if}
    {/snippet}
  </PictureIntakeBody>

  {#snippet actions()}
    <button class="btn ghost" type="button" onclick={onLeave}>{t("common.cancel")}</button>
    <button class="btn primary" type="button" disabled={!canContinue(importState)} onclick={onNext}>
      {t("common.next")}
    </button>
  {/snippet}
</ImportFrame>
