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
  <div class="what">
    <h2 class="eyebrow">{t("slideshow.pictures")}</h2>
    <p class="muted sorted">
      {#if ownOrder}
        {t("slideshow.ownOrder")} ·
        <span class="wide">{t("slideshow.reorderHintWide")}</span><span class="narrow"
          >{t("slideshow.reorderHintNarrow")}</span
        >
      {:else}
        {t("slideshow.sortedByDate")}<span class="narrow">
          · {t("slideshow.selectHintNarrow")}</span
        >
      {/if}
    </p>
  </div>
  <span class="mono muted">{count}</span>
  <button
    class="btn small"
    type="button"
    aria-pressed={selecting}
    onclick={onToggleSelect}
    aria-label={t("slideshow.select")}
  >
    <Icon name="checkCircle" /><span>{t("slideshow.select")}</span>
  </button>
  <button class="btn small" type="button" onclick={onAdd} aria-label={t("add.title")}>
    <Icon name="plus" /><span class="wide">{t("add.title")}</span><span class="narrow"
      >{t("add.titleShort")}</span
    >
  </button>
</div>

<style>
  .strip-head {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }
  .what {
    flex: 1;
    min-width: 0;
  }
  h2 {
    margin: 0;
  }
  .sorted {
    margin: 3px 0 0;
  }
  .btn {
    align-self: center;
  }
  .narrow {
    display: none;
  }
  @container (max-width: 720px) {
    .wide {
      display: none;
    }
    .narrow {
      display: inline;
    }
  }
</style>
