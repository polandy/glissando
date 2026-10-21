<script lang="ts">
  import type { FocusDisplayStatus } from "../../focus/pictures-focus";
  import { getTranslator } from "../../i18n/context";
  import {
    FOCUS_STATUS_COLOR,
    FOCUS_STATUS_LABEL_KEY,
    visibleFocusStatuses,
    type FocusSheetFilter,
  } from "./focus-sheet-view";

  /** The stacked bar and its legend chips: tapping a chip filters the grid below it (ADR-0041). */
  let {
    counts,
    ownMotionCount,
    filter,
    onFilter,
  }: {
    counts: Readonly<Record<FocusDisplayStatus, number>>;
    ownMotionCount: number;
    filter: FocusSheetFilter;
    onFilter: (filter: FocusSheetFilter) => void;
  } = $props();

  const { t } = getTranslator();

  const order = $derived(visibleFocusStatuses(counts));

  function toggle(next: FocusSheetFilter): void {
    onFilter(filter === next ? null : next);
  }
</script>

<div class="stack">
  {#each order as status (status)}
    <i style:flex={counts[status]} style:background={FOCUS_STATUS_COLOR[status]}></i>
  {/each}
</div>
<div class="legend">
  {#each order as status (status)}
    <button type="button" aria-pressed={filter === status} onclick={() => toggle(status)}>
      <span class="dot" style:background={FOCUS_STATUS_COLOR[status]}></span>
      {t(FOCUS_STATUS_LABEL_KEY[status])}
      <span class="n">{counts[status]}</span>
    </button>
  {/each}
  {#if ownMotionCount > 0}
    <button type="button" aria-pressed={filter === "ownMotion"} onclick={() => toggle("ownMotion")}>
      {t("focusSheet.ownMotion")}
      <span class="n">{ownMotionCount}</span>
    </button>
  {/if}
</div>

<style>
  .stack {
    display: flex;
    height: 10px;
    border-radius: var(--gl-radius-small);
    overflow: hidden;
    gap: 2px;
  }
  .stack i {
    display: block;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .legend button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-pill);
    background: var(--gl-raised);
    color: var(--gl-ink);
    font-size: var(--gl-size-label);
    cursor: pointer;
  }
  .legend button[aria-pressed="true"] {
    border-color: var(--gl-ink);
    background: var(--gl-ink);
    color: var(--gl-surface);
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex: none;
  }
  .n {
    font-family: var(--gl-font-mono);
    font-size: var(--gl-size-small);
    opacity: 0.75;
  }
</style>
