<script lang="ts">
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
        · <span class="wide">{t("slideshow.reorderHintWide")}</span><span class="narrow"
          >{t("slideshow.reorderHintNarrow")}</span
        >
      {:else if busy}
        · {t("import.sortedInAtEnd")}
      {/if}
    {:else if variant === "import"}
      {t("import.captureOrder")}
      {#if busy}
        · {t("import.sortedInByDate")}
      {/if}
    {:else}
      {t("slideshow.sortedByDate")}
    {/if}
  </p>
  <span class="mono muted count">{count}</span>
  <button
    class="btn small shuffle"
    type="button"
    onclick={onShuffle}
    disabled={count < 2}
    aria-label={t("slideshow.shuffle")}
  >
    <Icon name="shuffle" /><span>{t("slideshow.shuffle")}</span>
  </button>
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

<style>
  /* The order line sits under the eyebrow; narrow, it takes the whole width below the buttons. */
  .strip-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto auto auto;
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
  .shuffle {
    grid-column: 3;
  }
  .select {
    grid-column: 4;
  }
  .add {
    grid-column: 5;
    grid-row: 1 / span 2;
    align-self: center;
  }
  .narrow {
    display: none;
  }
  /* Narrow, the buttons take a row of their own: beside the eyebrow they squeeze it out in German. */
  @container (max-width: 720px) {
    .strip-head {
      grid-template-columns: auto auto auto minmax(0, 1fr);
      row-gap: 8px;
    }
    h2 {
      grid-column: 1 / span 3;
    }
    .count {
      grid-area: 1 / 4;
      justify-self: end;
    }
    .btn,
    .add {
      grid-row: 2;
    }
    .shuffle {
      grid-column: 1;
    }
    .select {
      grid-column: 2;
    }
    .add {
      grid-column: 3;
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
