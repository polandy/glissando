<script lang="ts">
  import { CARD_TINTS } from "../../../../library/stored-card";
  import type { CardTint } from "../../../../library/stored-slideshow";
  import ChipRow from "../../../components/ChipRow.svelte";
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
  <ChipRow
    choices={CARD_TINTS}
    selected={tint}
    label={(choice) => t(`cards.tint-${choice}`)}
    ariaLabel={t("cards.tintLabel")}
    {onChange}
  />
</div>

<style>
  .tint {
    display: grid;
    gap: 4px;
  }
</style>
