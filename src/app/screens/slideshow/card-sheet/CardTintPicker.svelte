<script lang="ts">
  import { CARD_TINTS } from "../../../../library/stored-card";
  import type { CardTint } from "../../../../library/stored-slideshow";
  import { getTranslator } from "../../../i18n/context";

  /**
   * The Background section's Tint chips, over a picture only (TITLE_SLIDES.md): From picture ·
   * Light · Dark. Changing the picture or the fade keeps the tint; this component only reports
   * the pick.
   */
  let {
    tint,
    onChange,
  }: {
    tint: CardTint;
    onChange: (tint: CardTint) => void;
  } = $props();

  const { t } = getTranslator();
</script>

<div class="tint">
  <span class="eyebrow">{t("cards.tintLabel")}</span>
  <div class="chiprow" role="group" aria-label={t("cards.tintLabel")}>
    {#each CARD_TINTS as tintId (tintId)}
      <button
        class="chip"
        class:checked={tint === tintId}
        type="button"
        aria-pressed={tint === tintId}
        onclick={() => onChange(tintId)}
      >
        {t(`cards.tint-${tintId}`)}
      </button>
    {/each}
  </div>
</div>

<style>
  .tint {
    display: grid;
    gap: 4px;
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
