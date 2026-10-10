<script lang="ts">
  import type { ImmichAvailabilityState } from "../../immich/immich-availability";
  import Dialog from "../components/Dialog.svelte";
  import ImmichBox from "../immich/ImmichBox.svelte";
  import { getTranslator } from "../i18n/context";
  import ImportFrame from "../import/ImportFrame.svelte";
  import { canContinue, hasSelection } from "../import/import-view";
  import PictureIntakeBody from "../import/PictureIntakeBody.svelte";
  import type { AddPicturesSession } from "./add-pictures-session";
  import { afterAdding } from "./after-adding";
  import AfterAddingBox from "./AfterAddingBox.svelte";

  /** Adding pictures to a slideshow: the import's pictures step without its steps and music. */
  let {
    session,
    loadThumbnail,
    onError,
    onDiscard,
    onCommit,
    immich,
    onOpenImmich,
    onImmichSettings,
  }: {
    session: AddPicturesSession;
    loadThumbnail: (pictureId: string) => Promise<Blob>;
    onError: (error: unknown) => void;
    /** Throws the selection away; `leave` also goes back to the slideshow. */
    onDiscard: (leave: boolean) => void;
    /** Stores the new pictures into the slideshow; settles once that is done or reported. */
    onCommit: () => Promise<void>;
    immich: ImmichAvailabilityState;
    onOpenImmich: () => void;
    /** An Immich problem's details are in the settings. */
    onImmichSettings: () => void;
  } = $props();

  const { t } = getTranslator();

  // The session is fixed for the screen's lifetime.
  // svelte-ignore state_referenced_locally
  let importState = $state.raw(session.intake.pictures.state);
  let confirmingDiscard = $state(false);
  let committing = $state(false);

  $effect(() => session.intake.pictures.subscribe((next) => (importState = next)));

  const ready = $derived(canContinue(importState));
  const after = $derived(ready ? afterAdding(session.slideshow, importState.pictures) : null);

  function leave(): void {
    if (hasSelection(importState)) {
      confirmingDiscard = true;
    } else {
      onDiscard(true);
    }
  }

  function add(files: readonly File[]): void {
    if (files.length > 0) {
      session.intake.addPictures(files);
    }
  }

  function commit(): void {
    committing = true;
    onCommit().finally(() => (committing = false));
  }
</script>

<ImportFrame
  step={null}
  crumbs={[session.slideshow.title, t("add.title")]}
  onBack={leave}
  backDisabled={committing}
>
  <div>
    <h1 class="title">{t("add.title")}</h1>
    <p class="lead">
      {session.slideshow.ownOrder ? t("add.leadOwnOrder") : t("add.leadByDate")}
      {t("add.leadDownscale")}
    </p>
  </div>

  <PictureIntakeBody
    intake={session.intake}
    {loadThumbnail}
    {onError}
    onFiles={add}
    onDiscard={() => onDiscard(false)}
    {immich}
    {onOpenImmich}
  >
    {#snippet sources()}
      <ImmichBox state={immich} onOpen={onOpenImmich} onSettings={onImmichSettings} />
    {/snippet}
  </PictureIntakeBody>

  {#if after !== null}
    <AfterAddingBox {after} />
  {/if}

  {#snippet actions()}
    <button class="btn ghost" type="button" disabled={committing} onclick={leave}>
      {t("common.cancel")}
    </button>
    <button class="btn primary" type="button" disabled={!ready || committing} onclick={commit}>
      {ready ? t("add.add", { count: importState.pictures.length }) : t("add.titleShort")}
    </button>
  {/snippet}
</ImportFrame>

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
