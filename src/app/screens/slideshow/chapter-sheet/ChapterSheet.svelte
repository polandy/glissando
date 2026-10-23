<script lang="ts">
  import { onMount } from "svelte";
  import type { SlideshowChapter } from "../../../../compose/chapters-of-slideshow";
  import { withinCaptionLimit } from "../../../../player/caption";
  import ResetButton from "../../../components/ResetButton.svelte";
  import SectionHead from "../../../components/SectionHead.svelte";
  import Switch from "../../../components/Switch.svelte";
  import type { ChapterSettingsEditor } from "../../../editing/chapter-settings-editor";
  import { getTranslator } from "../../../i18n/context";
  import type { SlideshowDetails } from "../../view-models";
  import CardFace from "../card-sheet/CardFace.svelte";
  import { CARD_PREVIEW_SETTLED_MS } from "../card-sheet/card-preview-model";
  import {
    resetChapterSubtitle,
    resetChapterTitle,
    setChapterSubtitle,
    setChapterTitle,
  } from "./chapter-sheet-edits";
  import { chapterPreviewFace } from "./chapter-preview-model";

  /**
   * A trip chapter's sheet (TRIP_CHAPTERS.md): a bottom sheet on the phone, a dialog from 720 px.
   * `anchorPictureId` null opens it in general mode, with only the automatic-chapters switch
   * (reached from the slideshow's facts panel even when no chapter is shown). Every field change
   * is stored as it is made, like the card sheet's.
   */
  let {
    slideshow,
    chapterEditor,
    anchorPictureId,
    onClose,
  }: {
    slideshow: SlideshowDetails;
    chapterEditor: ChapterSettingsEditor | null;
    anchorPictureId: string | null;
    onClose: () => void;
  } = $props();

  const { t } = getTranslator();

  const chapter = $derived(
    anchorPictureId === null
      ? null
      : (slideshow.chapters.find((candidate) => candidate.anchorPictureId === anchorPictureId) ??
          null),
  );
  const face = $derived(chapter === null ? null : chapterPreviewFace(chapter, slideshow.pictures));

  let dialog: HTMLDialogElement;

  onMount(() => {
    dialog.showModal();
    return () => dialog.close();
  });

  function cancel(event: Event): void {
    event.preventDefault();
    onClose();
  }

  // The sheet fills the dialog, so a click that lands on the dialog itself is on its backdrop.
  function closeOnScrim(event: MouseEvent): void {
    if (event.target === dialog) {
      onClose();
    }
  }

  function titleInput(current: SlideshowChapter, target: HTMLInputElement): void {
    const capped = withinCaptionLimit(target.value);
    if (capped !== target.value) {
      target.value = capped;
    }
    setChapterTitle(chapterEditor, current, capped);
  }

  function subtitleInput(current: SlideshowChapter, target: HTMLInputElement): void {
    const capped = withinCaptionLimit(target.value);
    if (capped !== target.value) {
      target.value = capped;
    }
    setChapterSubtitle(chapterEditor, current, capped);
  }

  function deleteChapter(current: SlideshowChapter): void {
    chapterEditor?.removeAddedChapter(current.anchorPictureId);
    onClose();
  }

  const sheetTitle = $derived(
    chapter === null
      ? t("chapters.sheetTitleGeneral")
      : chapter.kind === "automatic"
        ? t("chapters.sheetTitleAutomatic")
        : t("chapters.sheetTitleAdded"),
  );

  const automaticHelper = $derived(
    slideshow.ownOrder
      ? t("chapters.automaticHelperDisabled")
      : slideshow.automaticChaptersOff
        ? t("chapters.automaticHelperOff")
        : t("chapters.automaticHelperOn"),
  );
</script>

<dialog
  bind:this={dialog}
  aria-labelledby="chapter-sheet-title"
  oncancel={cancel}
  onclick={closeOnScrim}
>
  <div class="sheet">
    <SectionHead id="chapter-sheet-title" title={sheetTitle} own={false} />

    {#if chapter !== null && face !== null}
      <div class="preview">
        <CardFace
          card={face.card}
          pictureUrl={face.pictureUrl}
          elapsedMs={CARD_PREVIEW_SETTLED_MS}
          fonts={document.fonts}
        />
      </div>

      <section class="field">
        <label class="eyebrow" for="chapter-title">{t("chapters.titleLabel")}</label>
        <input
          id="chapter-title"
          class="input"
          type="text"
          value={chapter.title}
          autocomplete="off"
          oninput={(event) => titleInput(chapter, event.currentTarget)}
        />
        <ResetButton
          automatic={!chapter.titleEdited}
          alreadyAutomatic={t("chapters.titleAlreadyAutomatic")}
          onReset={() => resetChapterTitle(chapterEditor, chapter)}
        />
      </section>

      <section class="field">
        <label class="eyebrow" for="chapter-subtitle">{t("chapters.subtitleLabel")}</label>
        <input
          id="chapter-subtitle"
          class="input"
          type="text"
          value={chapter.subtitle}
          autocomplete="off"
          oninput={(event) => subtitleInput(chapter, event.currentTarget)}
        />
        <ResetButton
          automatic={!chapter.subtitleEdited}
          alreadyAutomatic={t("chapters.subtitleAlreadyAutomatic")}
          onReset={() => resetChapterSubtitle(chapterEditor, chapter)}
        />
      </section>

      {#if chapter.kind === "automatic"}
        <div class="row switch-row">
          <div>
            <b>{t("chapters.hideSwitch")}</b>
            <small>{t("chapters.hideHelper")}</small>
          </div>
          <Switch
            checked={chapter.hidden}
            label={t("chapters.hideSwitch")}
            onChange={(hidden) => chapterEditor?.setChapterHidden(chapter.anchorPictureId, hidden)}
          />
        </div>
      {:else}
        <button class="btn small ghost" type="button" onclick={() => deleteChapter(chapter)}>
          {t("chapters.deleteChapter")}
        </button>
      {/if}
    {/if}

    <div class="row switch-row">
      <div>
        <b>{t("chapters.automaticSwitch")}</b>
        <small>{automaticHelper}</small>
      </div>
      <Switch
        checked={!slideshow.automaticChaptersOff}
        disabled={slideshow.ownOrder}
        label={t("chapters.automaticSwitch")}
        onChange={(on) => chapterEditor?.setAutomaticChaptersOff(!on)}
      />
    </div>

    <footer>
      <button class="btn primary" type="button" onclick={onClose}>{t("slideshow.done")}</button>
    </footer>
  </div>
</dialog>

<style>
  dialog {
    width: calc(100% - 40px);
    max-width: 480px;
    max-height: calc(100% - 48px);
    padding: 0;
    overflow: auto;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
    color: var(--gl-ink);
    box-shadow: var(--gl-shadow);
  }
  dialog::backdrop {
    background: var(--gl-backdrop);
  }
  .sheet {
    display: grid;
    gap: 16px;
    padding: 18px;
  }
  .preview {
    aspect-ratio: 4 / 3;
    overflow: hidden;
    border-radius: var(--gl-radius-tile);
  }
  .field {
    display: grid;
    gap: 8px;
  }
  .eyebrow {
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
  .input {
    height: 38px;
    padding: 0 11px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
    outline: none;
    background: var(--gl-raised);
    color: var(--gl-ink);
    font: inherit;
    font-size: var(--gl-size-body);
  }
  .input:focus {
    border-color: var(--gl-accent);
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .switch-row small {
    display: block;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
    font-weight: var(--gl-weight-regular);
  }
  footer {
    display: flex;
    justify-content: flex-end;
  }
  @media (max-width: 720px) {
    dialog {
      inset: auto 0 0;
      width: auto;
      max-width: none;
      max-height: 85%;
      margin: 0;
      border-width: 1px 0 0;
      border-radius: var(--gl-radius-large) var(--gl-radius-large) 0 0;
    }
    .sheet {
      padding-bottom: calc(18px + env(safe-area-inset-bottom));
    }
  }
</style>
