<script lang="ts">
  import type { TimelineMonth } from "../../immich/immich-client";
  import { getTranslator } from "../i18n/context";
  import { monthYears } from "./immich-tools";

  /** The months by year, each with its approximate picture count; a tap picks one. */
  let {
    months,
    current,
    onPick,
  }: {
    months: readonly TimelineMonth[];
    /** The month shown now (`YYYY-MM`). */
    current: string | null;
    onPick: (month: string) => void;
  } = $props();

  const { t, formatMonthName } = getTranslator();
  const years = $derived(monthYears(months));
</script>

{#each years as { year, months: inYear } (year)}
  <h3 class="year">{year}</h3>
  <div class="months">
    {#each inYear as { month, count } (month)}
      <button
        class="month"
        class:on={month === current}
        type="button"
        aria-current={month === current ? "true" : undefined}
        onclick={() => onPick(month)}
      >
        <span>{formatMonthName(month)}</span>
        <span class="mono count">{t("immich.monthCount", { count })}</span>
      </button>
    {/each}
  </div>
{/each}

<style>
  .year {
    margin: 10px 6px 4px;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
    font-weight: var(--gl-weight-semibold);
  }
  .months {
    display: grid;
    gap: 2px;
  }
  .month {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 8px;
    border: 0;
    border-radius: var(--gl-radius-small);
    background: transparent;
    color: var(--gl-ink);
    font: inherit;
    cursor: pointer;
  }
  .month:hover {
    background: var(--gl-hover);
  }
  .month.on {
    background: var(--gl-accent);
    color: var(--gl-accent-ink);
  }
  .count {
    color: var(--gl-faint);
    font-size: var(--gl-size-caption);
  }
  .on .count {
    color: inherit;
  }
  @container (max-width: 720px) {
    .months {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .month {
      flex-direction: column;
      align-items: flex-start;
      gap: 0;
    }
  }
</style>
