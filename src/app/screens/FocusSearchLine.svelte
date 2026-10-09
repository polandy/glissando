<script lang="ts">
  import type { SlideshowSearch } from "../../library/focus-pass";
  import { getTranslator } from "../i18n/context";

  /** On a library card: how far the background search for the slideshow's subjects is. */
  let { search }: { search: SlideshowSearch } = $props();

  const { t } = getTranslator();
  const label = $derived(t("start.searchingSubjects"));
</script>

<span class="search">
  <span class="line">
    {label} · {t("start.searchProgress", { done: search.done, total: search.total })}
  </span>
  <span
    class="hairline"
    role="progressbar"
    aria-label={label}
    aria-valuemin={0}
    aria-valuemax={search.total}
    aria-valuenow={search.done}
  >
    <i style:width="{(search.done / search.total) * 100}%"></i>
  </span>
</span>

<style>
  .search {
    display: block;
  }
  .line {
    display: block;
    margin: 6px 0 7px;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
  .hairline {
    display: block;
    height: 2px;
    overflow: hidden;
    border-radius: 1px;
    background: var(--gl-hover);
  }
  .hairline i {
    display: block;
    height: 100%;
    border-radius: 1px;
    background: var(--gl-mint);
    transition: width 0.5s ease;
  }
  @media (prefers-reduced-motion: reduce) {
    .hairline i {
      transition: none;
    }
  }
</style>
