<script lang="ts">
  import { CARD_ENTRANCES, type CardEntrance } from "../../../../player/slideshow";
  import ChipRow from "../../../components/ChipRow.svelte";
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
  <ChipRow
    choices={CARD_ENTRANCES}
    selected={entrance}
    label={(choice) => t(`cards.entrance-${choice}`)}
    ariaLabelledby="card-entrance-title"
    {onChange}
  />
</section>

<style>
  .entrance {
    display: grid;
    gap: 10px;
  }
</style>
