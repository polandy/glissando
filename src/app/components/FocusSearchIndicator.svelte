<script lang="ts">
  import type { RunningSearch } from "../../library/running-search";
  import { getTranslator } from "../i18n/context";

  /**
   * The background faces-and-subjects search's place in the header, in the export indicator's
   * form: a lilac ring, its label and a thin line below.
   */
  let { search, besideExport }: { search: RunningSearch; besideExport: boolean } = $props();

  const PERCENT = 100;
  const { t } = getTranslator();
  const fraction = $derived(search.done / search.total);
  const label = $derived(t(search.again ? "start.searchingAgain" : "start.searchingSubjects"));
</script>

<div
  class="indicator"
  role="progressbar"
  aria-label={label}
  aria-valuemin={0}
  aria-valuemax={search.total}
  aria-valuenow={search.done}
>
  <svg class="progress-ring" viewBox="0 0 20 20" aria-hidden="true">
    <circle class="track" cx="10" cy="10" r="7.5" pathLength={PERCENT} />
    <circle
      class="done"
      cx="10"
      cy="10"
      r="7.5"
      pathLength={PERCENT}
      stroke-dasharray="{fraction * PERCENT} {PERCENT}"
    />
  </svg>
  <span class="label">
    {label} · {t("start.searchProgress", { done: search.done, total: search.total })}
  </span>
  <span class="label-short"
    >{t("start.searchShort", { done: search.done, total: search.total })}</span
  >
</div>
<!-- Beside an export, it sits on top of the export's thicker line, so both stay readable. -->
<span
  class="line"
  class:raised={besideExport}
  style:width="{fraction * PERCENT}%"
  aria-hidden="true"
></span>

<style>
  .indicator {
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
    font-weight: var(--gl-weight-medium);
    white-space: nowrap;
  }
  .progress-ring {
    flex: none;
    width: 18px;
    height: 18px;
    /* The arc starts at twelve o'clock. */
    transform: rotate(-90deg);
    fill: none;
    stroke-width: 3;
  }
  .track {
    stroke: var(--gl-line);
  }
  .done {
    stroke: var(--gl-searching);
  }
  .line {
    position: absolute;
    left: 0;
    bottom: -1px;
    height: 2px;
    background: var(--gl-searching);
    transition: width 0.3s;
  }
  .line.raised {
    bottom: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    .line {
      transition: none;
    }
  }
  .label-short {
    display: none;
  }
  /* A phone has no room for the long label; the short one keeps the ring from being the only signal. */
  @container (max-width: 720px) {
    .label {
      display: none;
    }
    .label-short {
      display: inline;
    }
  }
</style>
