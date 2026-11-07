<script lang="ts">
  import {
    AUTOMATIC_PORTRAIT_PICTURES,
    RESOLVED_PORTRAIT_PICTURES_CHOICES,
    type PortraitPictures,
    type ResolvedPortraitPictures,
  } from "../../../library/portrait-pictures";
  import ResetButton from "../../components/ResetButton.svelte";
  import SectionHead from "../../components/SectionHead.svelte";
  import Sheet from "../../components/Sheet.svelte";
  import { radioIndexForKey } from "../../components/radio-keys";
  import { getTranslator } from "../../i18n/context";
  import type { SlideshowDetails } from "../view-models";
  import PortraitPictureTile from "./PortraitPictureTile.svelte";

  /**
   * The slideshow's portrait pictures setting (ADR-0028): automatic pairs and blurs by default;
   * a pick is stored at once. Picking automatic resets the setting rather than storing a choice.
   */
  let {
    slideshow,
    onPortraitPictures,
    onReset,
    onClose,
  }: {
    slideshow: SlideshowDetails;
    onPortraitPictures: (choice: PortraitPictures) => void;
    /** "Back to automatic"; offered while another choice is stored. */
    onReset: () => void;
    /** "Done", the scrim, Esc. */
    onClose: () => void;
  } = $props();

  const { t } = getTranslator();

  const isAutomatic = $derived(slideshow.portraitPictures === AUTOMATIC_PORTRAIT_PICTURES);

  const radios: HTMLButtonElement[] = $state([]);

  function focusChosenPicture(): void {
    radios[RESOLVED_PORTRAIT_PICTURES_CHOICES.indexOf(slideshow.portraitPictures)]?.focus();
  }

  function pick(choice: ResolvedPortraitPictures): void {
    if (choice === AUTOMATIC_PORTRAIT_PICTURES) {
      onReset();
    } else {
      onPortraitPictures(choice);
    }
  }

  // Selection follows focus, as in the WAI-ARIA radio group: one tab stop, arrows choose.
  function onkeydown(event: KeyboardEvent, index: number): void {
    const next = radioIndexForKey(event.key, index, RESOLVED_PORTRAIT_PICTURES_CHOICES.length);
    const choice = next === null ? undefined : RESOLVED_PORTRAIT_PICTURES_CHOICES[next];
    if (next === null || choice === undefined) {
      return;
    }
    event.preventDefault();
    pick(choice);
    radios[next]?.focus();
  }
</script>

<Sheet labelId="portrait-pictures-title" onOpen={focusChosenPicture} {onClose}>
  <SectionHead
    id="portrait-pictures-title"
    title={t("portrait.title")}
    stateText={isAutomatic ? t("portrait.default") : t("portrait.ownChoice")}
    own={!isAutomatic}
  />
  <div class="options" role="radiogroup" aria-labelledby="portrait-pictures-title">
    {#each RESOLVED_PORTRAIT_PICTURES_CHOICES as choice, index (choice)}
      <PortraitPictureTile
        bind:radio={radios[index]}
        {choice}
        checked={choice === slideshow.portraitPictures}
        automatic={isAutomatic}
        onPick={() => pick(choice)}
        onKeydown={(event) => onkeydown(event, index)}
      />
    {/each}
  </div>
  <p class="note">{t("portrait.note")}</p>
  <footer>
    <ResetButton
      automatic={isAutomatic}
      alreadyAutomatic={t("portrait.alreadyAutomatic")}
      label={t("portrait.reset")}
      {onReset}
    />
    <button class="btn primary" type="button" onclick={onClose}>{t("slideshow.done")}</button>
  </footer>
</Sheet>

<style>
  .options {
    display: grid;
    gap: 8px;
  }
  .note {
    margin: 0;
    padding: 10px 12px;
    border-radius: var(--gl-radius);
    background: var(--gl-hover);
    font-size: var(--gl-size-meta);
    line-height: 1.45;
  }
  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
</style>
