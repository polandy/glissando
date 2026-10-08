<script lang="ts">
  import type { StoredSlideshow } from "../../library/stored-slideshow";
  import BlockingOverlay from "../components/BlockingOverlay.svelte";
  import Dialog from "../components/Dialog.svelte";
  import { getTranslator } from "../i18n/context";
  import type { ImportStep } from "../navigation/route";
  import MusicStep from "./MusicStep.svelte";
  import PicturesStep from "./PicturesStep.svelte";
  import type { ImportSession } from "./import-session";
  import { hasSelection } from "./import-view";

  let {
    step,
    session,
    loadThumbnail,
    onError,
    onMusicUnreadable,
    onToMusic,
    onBack,
    onDiscard,
    onCreated,
  }: {
    step: ImportStep;
    session: ImportSession;
    loadThumbnail: (pictureId: string) => Promise<Blob>;
    onError: (error: unknown) => void;
    onMusicUnreadable: (retry: () => void) => void;
    onToMusic: () => void;
    /** One step up, keeping the selection. */
    onBack: () => void;
    /** Throws the selection away; `leave` also leaves the wizard. */
    onDiscard: (leave: boolean) => void;
    onCreated: (slideshow: StoredSlideshow) => void;
  } = $props();

  const { t, language } = getTranslator();

  let confirmingDiscard = $state(false);
  let creating = $state(false);

  function leave(): void {
    if (hasSelection(session.pictures.state)) {
      confirmingDiscard = true;
    } else {
      onDiscard(true);
    }
  }

  function create(): void {
    creating = true;
    session
      .create(language)
      .then(onCreated, onError)
      .finally(() => (creating = false));
  }
</script>

{#if step === "pictures"}
  <PicturesStep
    {session}
    {loadThumbnail}
    {onError}
    onLeave={leave}
    onNext={onToMusic}
    onDiscard={() => onDiscard(false)}
  />
{:else}
  <MusicStep {session} {onBack} onCreate={create} {onError} {onMusicUnreadable} />
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
  <BlockingOverlay title={t("import.creatingTitle")} detail={t("import.creatingText")} />
{/if}
