<script lang="ts">
  import Icon from "../../components/Icon.svelte";
  import { getTranslator } from "../../i18n/context";

  /** Above the strip: its order, the picture count, "Select" and "Add pictures". */
  let {
    count,
    ownOrder,
    selecting,
    onToggleSelect,
    onAdd,
  }: {
    count: number;
    ownOrder: boolean;
    /** Selecting several is on (dev-docs/APP.md, Selecting several). */
    selecting: boolean;
    onToggleSelect: () => void;
    onAdd: () => void;
  } = $props();

  const { t } = getTranslator();
</script>

<div class="strip-head">
  <h2 class="eyebrow">{t("slideshow.pictures")}</h2>
  <p class="muted sorted">
    {#if ownOrder}
      {t("slideshow.ownOrder")} ·
      <span class="wide">{t("slideshow.reorderHintWide")}</span><span class="narrow"
        >{t("slideshow.reorderHintNarrow")}</span
      >
    {:else}
      {t("slideshow.sortedByDate")}<span class="narrow">{" · "}{t("slideshow.selectHintNarrow")}</span>
    {/if}
  </p>
  <span class="mono muted count">{count}</span>
  <button
    class="btn small select"
    type="button"
    aria-pressed={selecting}
    onclick={onToggleSelect}
    aria-label={t("slideshow.select")}
  >
    <Icon name="checkCircle" /><span>{t("slideshow.select")}</span>
  </button>
  <button class="btn small add" type="button" onclick={onAdd} aria-label={t("add.title")}>
    <Icon name="plus" /><span class="wide">{t("add.title")}</span><span class="narrow"
      >{t("add.titleShort")}</span
    >
  </button>
</div>

<style>
  /* The order line sits under the eyebrow; narrow, it takes the whole width below the buttons. */
  .strip-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto auto;
    column-gap: 12px;
    align-items: baseline;
  }
  h2 {
    grid-area: 1 / 1;
    margin: 0;
  }
  .count {
    grid-area: 1 / 2;
  }
  .sorted {
    grid-area: 2 / 1;
    margin: 3px 0 0;
  }
  .btn {
    grid-row: 1 / span 2;
    align-self: center;
  }
  .select {
    grid-column: 3;
  }
  .add {
    grid-column: 4;
  }
  .narrow {
    display: none;
  }
  @container (max-width: 720px) {
    .btn {
      grid-row: 1;
    }
    .sorted {
      grid-column: 1 / -1;
    }
    .wide {
      display: none;
    }
    .narrow {
      display: inline;
    }
  }
</style>
