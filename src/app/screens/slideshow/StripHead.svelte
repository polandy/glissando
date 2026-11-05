<script lang="ts">
  import Separator from "../../components/Separator.svelte";
  import type { Snippet } from "svelte";
  import Icon from "../../components/Icon.svelte";
  import { getTranslator } from "../../i18n/context";

  /** Above the strip: its order, the picture count, "Select" and "Add media". */
  let {
    count,
    ownOrder,
    selecting,
    onToggleSelect,
    onShuffle,
    onSortByDate,
    onAdd = () => undefined,
    variant = "editor",
    busy = false,
    add,
  }: {
    count: number;
    ownOrder: boolean;
    /** Selecting several is on (dev-docs/app/slideshow-editing/SELECTING_SEVERAL.md, Selecting several). */
    selecting: boolean;
    onToggleSelect: () => void;
    /** Puts the pictures in a new random order. */
    onShuffle: () => void;
    /** Puts every picture back in capture-date order; offered while the order is the user's own. */
    onSortByDate: () => void;
    /** Unused while `add` is given. */
    onAdd?: () => void;
    /** "import" reads the order as capture order, not sorted by date (IMPORT_ARRANGING.md). */
    variant?: "editor" | "import";
    /** An import is still running: says where a newly-ready picture joins the order. */
    busy?: boolean;
    /** Replaces the default "Add media" button, e.g. the pictures step's own add menu. */
    add?: Snippet | undefined;
  } = $props();

  const { t } = getTranslator();
</script>

<div class="strip-head">
  <h2 class="eyebrow">{t("slideshow.pictures")}</h2>
  <p class="muted sorted">
    {#if ownOrder}
      {t("slideshow.ownOrder")}
      {#if variant === "editor"}
        <Separator /><span class="wide">{t("slideshow.reorderHintWide")}</span><span class="narrow"
          >{t("slideshow.reorderHintNarrow")}</span
        >
      {:else if busy}
        <Separator />{t("import.sortedInAtEnd")}
      {/if}
    {:else if variant === "import"}
      {t("import.captureOrder")}
      {#if busy}
        <Separator />{t("import.sortedInByDate")}
      {/if}
    {:else}
      {t("slideshow.sortedByDate")}
    {/if}
  </p>
  <span class="mono muted count">{count}</span>
  <div class="head-buttons">
    <button
      class="btn small shuffle"
      type="button"
      onclick={onShuffle}
      disabled={count < 2}
      aria-label={t("slideshow.shuffle")}
    >
      <Icon name="shuffle" /><span>{t("slideshow.shuffle")}</span>
    </button>
    {#if ownOrder}
      <button
        class="btn small sort-by-date"
        type="button"
        onclick={onSortByDate}
        aria-label={t("slideshow.sortByDateLabel")}
      >
        <Icon name="sortByDate" /><span>{t("slideshow.sortByDate")}</span>
      </button>
    {/if}
    <button
      class="btn small select"
      type="button"
      aria-pressed={selecting}
      onclick={onToggleSelect}
      aria-label={t("slideshow.select")}
    >
      <Icon name="checkCircle" /><span>{t("slideshow.select")}</span>
    </button>
    <span class="add">
      {#if add}
        {@render add()}
      {:else}
        <button class="btn small" type="button" onclick={onAdd} aria-label={t("add.title")}>
          <Icon name="plus" /><span class="wide">{t("add.title")}</span><span class="narrow"
            >{t("add.titleShort")}</span
          >
        </button>
      {/if}
    </span>
  </div>
</div>

<style>
  /* The order line sits under the eyebrow; narrow, the buttons take a row of their own and the order line the whole width below. */
  .strip-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
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
  .head-buttons {
    grid-area: 1 / 3 / span 2;
    align-self: center;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .narrow {
    display: none;
  }
  /* Narrow, the buttons take a row of their own: beside the eyebrow they squeeze it out in German; on a phone they may wrap. */
  @container (max-width: 720px) {
    .strip-head {
      grid-template-columns: minmax(0, 1fr) auto;
      row-gap: 8px;
    }
    .count {
      grid-area: 1 / 2;
      justify-self: end;
    }
    .head-buttons {
      grid-area: 2 / 1 / auto / -1;
      flex-wrap: wrap;
      row-gap: 8px;
    }
    .sorted {
      grid-area: 3 / 1 / auto / -1;
    }
    .wide {
      display: none;
    }
    .narrow {
      display: inline;
    }
  }
</style>
