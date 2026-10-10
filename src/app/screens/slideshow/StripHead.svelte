<script lang="ts">
  import Icon from "../../components/Icon.svelte";
  import { getTranslator } from "../../i18n/context";

  /** Above the strip: its order, the picture count and "Add pictures". */
  let { count, ownOrder, onAdd }: { count: number; ownOrder: boolean; onAdd: () => void } =
    $props();

  const { t } = getTranslator();
</script>

<div class="strip-head">
  <div class="what">
    <h2 class="eyebrow">{t("slideshow.pictures")}</h2>
    <p class="muted sorted">
      {ownOrder ? t("slideshow.ownOrder") : t("slideshow.sortedByDate")} ·
      <span class="wide">{t("slideshow.reorderHintWide")}</span><span class="narrow"
        >{t("slideshow.reorderHintNarrow")}</span
      >
    </p>
  </div>
  <span class="mono muted">{count}</span>
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
