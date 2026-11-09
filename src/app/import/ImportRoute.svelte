<script lang="ts">
  import type { ImmichAvailabilityState } from "../../immich/immich-availability";
  import type { ExistingSlideshow } from "../../compose";
  import type { StoredSlideshow } from "../../library/stored-slideshow";
  import BlockingOverlay from "../components/BlockingOverlay.svelte";
  import Dialog from "../components/Dialog.svelte";
  import { getTranslator } from "../i18n/context";
  import type { Navigator } from "../navigation/navigator";
  import { isSelectingScreen, type ImportStep } from "../navigation/route";
  import type { SamplePreview } from "../sample-music/sample-preview";
  import type { Toaster } from "../toast/toaster";
  import MusicStep from "./MusicStep.svelte";
  import type { OpenNotice } from "../glissando-file/open-flow";
  import PicturesStep from "./PicturesStep.svelte";
  import type { ImportSession } from "./import-session";
  import { hasSelection } from "./import-view";
  import type { SlideshowHome } from "../../server-library/server-library-memory";
  import { ServerLibraryUnavailableError } from "../../server-library/server-library-client";

  let {
    step,
    session,
    loadExistingSlideshows,
    loadThumbnail,
    loadPicture,
    onError,
    onToMusic,
    onBack,
    onDiscard,
    onCreated,
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
    onCreateFailed,
    samplePreview,
    toaster,
    guardLeave,
  }: {
    step: ImportStep;
    session: ImportSession;
    /** The slideshows the new one's automatic title keeps clear of. */
    loadExistingSlideshows: () => Promise<readonly ExistingSlideshow[]>;
    loadThumbnail: (pictureId: string) => Promise<Blob>;
    loadPicture: (pictureId: string) => Promise<Blob>;
    onError: (error: unknown) => void;
    onToMusic: () => void;
    /** One step up, keeping the selection. */
    onBack: () => void;
    /** Throws the selection away; `leave` also leaves the wizard. */
    onDiscard: (leave: boolean) => void;
    onCreated: (slideshow: StoredSlideshow) => void;
    onOpenFile: (file: File) => void;
    notice: OpenNotice | null;
    onDismissNotice: () => void;
    onReload: () => void;
    immich: ImmichAvailabilityState;
    onOpenImmich: () => void;
    onImmichSettings: () => void;
    /** The server library is on: step 1 asks where the slideshow lives. */
    serverOn: boolean;
    rememberedHome: SlideshowHome;
    onHomeChosen: (home: SlideshowHome) => void;
    /** Creating a server slideshow failed as the server is away; the wizard stays as it was. */
    onCreateFailed: (retry: () => void) => void;
    /** `undefined` when the build turns sample music off (SAMPLE_MUSIC.md). */
    samplePreview?: SamplePreview | undefined;
    toaster: Toaster;
    /** Registers the check that keeps a selection from being dropped silently by the browser back. */
    guardLeave: Navigator["guardLeave"];
  } = $props();

  const translator = getTranslator();
  const { t } = translator;

  let confirmingDiscard = $state(false);
  let creating = $state(false);
  let creatingOnServer = $state(false);

  $effect(() =>
    guardLeave((to) => {
      if (isSelectingScreen(to) || !hasSelection(session.pictures.state)) {
        return true;
      }
      confirmingDiscard = true;
      return false;
    }),
  );

  function leave(): void {
    if (hasSelection(session.pictures.state)) {
      confirmingDiscard = true;
    } else {
      onDiscard(true);
    }
  }

  /** A library that cannot be listed is reported; the title then only keeps clear of nothing. */
  function existingSlideshows(): Promise<readonly ExistingSlideshow[]> {
    return loadExistingSlideshows().catch((error: unknown) => {
      onError(error);
      return [];
    });
  }

  function create(title: string): void {
    creatingOnServer = session.choices.current().home === "server";
    creating = true;
    session
      .create(translator.language, title)
      .then(onCreated, (error: unknown) => {
        if (error instanceof ServerLibraryUnavailableError) onCreateFailed(() => create(title));
        else onError(error);
      })
      .finally(() => (creating = false));
  }
</script>

{#if step === "pictures"}
  <PicturesStep
    {session}
    {loadThumbnail}
    {loadPicture}
    {onError}
    onLeave={leave}
    onNext={onToMusic}
    onDiscard={() => onDiscard(false)}
    {onOpenFile}
    {notice}
    {onDismissNotice}
    {onReload}
    {immich}
    {onOpenImmich}
    {onImmichSettings}
    {serverOn}
    {rememberedHome}
    {onHomeChosen}
  />
{:else}
  {#await existingSlideshows() then existing}
    <MusicStep
      {session}
      existingSlideshows={existing}
      {loadThumbnail}
      {onBack}
      onCreate={create}
      {onError}
      {samplePreview}
      {toaster}
    />
  {/await}
{/if}

{#if confirmingDiscard}
  <Dialog
    title={t("import.discardTitle")}
    message={t("import.discardText")}
    onCancel={() => (confirmingDiscard = false)}
    actions={[
      { label: t("import.keepChoosing"), onSelect: () => (confirmingDiscard = false) },
      {
        label: t("import.discard"),
        tone: "danger",
        onSelect: () => {
          confirmingDiscard = false;
          onDiscard(true);
        },
      },
    ]}
  />
{/if}

{#if creating}
  <BlockingOverlay
    title={creatingOnServer ? t("server.creating") : t("import.creatingTitle")}
    detail={t("import.creatingText")}
  />
{/if}
