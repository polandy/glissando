<script lang="ts">
  import { CARD_ENTRANCES, type CardEntrance } from "../../../../player/slideshow";
  import SectionHead from "../../../components/SectionHead.svelte";
  import { getTranslator } from "../../../i18n/context";

  /**
   * The card sheet's Entrance section (TITLE_SLIDES.md): a wrapping row of chips, two rows on a
   * phone, one row from desktop. Picking a chip plays its enter phase once in the preview; the
   * sheet drives that replay, this component only reports the pick.
   */
  let {
    entrance,
    onChange,
  }: {
    entrance: CardEntrance;
    onChange: (entrance: CardEntrance) => void;
  } = $props();

  const { t } = getTranslator();
</script>

<section class="entrance">
  <SectionHead id="card-entrance-title" title={t("cards.entranceLabel")} own={false} />
  <div class="chiprow" role="group" aria-labelledby="card-entrance-title">
    {#each CARD_ENTRANCES as choice (choice)}
      <button
        class="chip"
        class:checked={choice === entrance}
        type="button"
        aria-pressed={choice === entrance}
        onclick={() => onChange(choice)}
      >
        {t(`cards.entrance-${choice}`)}
      </button>
    {/each}
  </div>
</section>

<style>
  .entrance {
    display: grid;
    gap: 10px;
  }
  .chiprow {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 4px;
    border-radius: var(--gl-radius);
    background: var(--gl-hover);
  }
  .chip {
    padding: 7px 10px;
    border: 0;
    border-radius: var(--gl-radius-small);
    background: transparent;
    color: inherit;
    font-size: var(--gl-size-small);
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
  }
  .chip.checked {
    background: var(--gl-surface);
    box-shadow: var(--gl-shadow);
    font-weight: 600;
  }
  .chip:focus-visible {
    outline: 2px solid var(--gl-accent);
    outline-offset: 2px;
  }
</style>
