<script lang="ts">
  import { CARD_FADE_STEP, MAX_CARD_FADE, MIN_CARD_FADE } from "../../../../library/stored-card";
  import { getTranslator } from "../../../i18n/context";

  /** The Background section's Fade slider, over a picture only (TITLE_SLIDES.md). */
  let {
    fade,
    onChange,
  }: {
    fade: number;
    onChange: (fade: number) => void;
  } = $props();

  const { t } = getTranslator();
</script>

<div class="fade">
  <label class="eyebrow" for="card-fade">{t("cards.fadeLabel")}</label>
  <input
    id="card-fade"
    type="range"
    min={MIN_CARD_FADE}
    max={MAX_CARD_FADE}
    step={CARD_FADE_STEP}
    value={fade}
    oninput={(event) => onChange(event.currentTarget.valueAsNumber)}
  />
  <div class="fade-ends">
    <span>{t("cards.fadeSubtle")}</span>
    <span>{t("cards.fadeStrong")}</span>
  </div>
</div>

<style>
  .fade {
    display: grid;
    gap: 4px;
  }
  .fade-ends {
    display: flex;
    justify-content: space-between;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
  @media (pointer: coarse) {
    input {
      min-height: var(--gl-hit-min);
    }
  }
</style>
