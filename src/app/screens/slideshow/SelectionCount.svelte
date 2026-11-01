<script lang="ts">
  import { getTranslator } from "../../i18n/context";

  /**
   * What is selected, announced on every change (SELECTING_SEVERAL.md, Selecting several): "Picture
   * 3 of 12" for one, a count chip for several.
   */
  let {
    several,
    count,
    range,
    total,
    soleIndex,
  }: {
    several: boolean;
    count: number;
    /** The 1-based first and last place of a contiguous selection; null when scattered. */
    range: { readonly from: number; readonly to: number } | null;
    total: number;
    soleIndex: number;
  } = $props();

  const { t } = getTranslator();
</script>

{#if several}
  <span class="count several" aria-live="polite">
    <b class="mono">{count}</b><span class="word"
      >{range === null
        ? t("slideshow.selectedCount", { count })
        : t("slideshow.selectedRange", { count, from: range.from, to: range.to, total })}</span
    >
  </span>
{:else}
  <span class="count" aria-live="polite">
    {t("slideshow.selectionCount", { number: soleIndex + 1, total })}
  </span>
{/if}

<style>
  .count {
    padding: 0 8px 0 6px;
    color: var(--gl-inverse-muted);
    font-size: var(--gl-size-small);
    white-space: nowrap;
  }
  /* Selecting several: the count in the accent. */
  .count.several {
    color: var(--gl-inverse-text);
    font-weight: var(--gl-weight-medium);
  }
  .count.several b {
    display: inline-grid;
    min-width: 22px;
    height: 22px;
    padding: 0 6px;
    margin-right: 5px;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-accent);
    color: var(--gl-accent-ink);
    font-weight: var(--gl-weight-medium);
    place-items: center;
  }
</style>
