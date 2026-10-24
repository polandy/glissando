<script lang="ts">
  import { getTranslator } from "../../i18n/context";

  /**
   * A plain fact row of the info panel: a pill value ("Automatic" or a mood's own), captioned
   * "by mood" underneath once a mood sets it (ADR-0045) instead of the single setting, or `note`
   * underneath instead (the energy pacing's "follows the energy", ADR-0046).
   */
  let {
    label,
    value,
    byMood,
    note,
  }: { label: string; value: string; byMood: boolean; note?: string | undefined } = $props();

  const { t } = getTranslator();
</script>

<div>
  <dt>{label}</dt>
  <dd>
    <span class="pill"><i></i>{value}</span>
    {#if byMood}
      <small>{t("mood.byMood")}</small>
    {:else if note !== undefined}
      <small>{note}</small>
    {/if}
  </dd>
</div>

<style>
  div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 9px 0;
    border-top: 1px solid var(--gl-line);
  }
  dt {
    flex: none;
    color: var(--gl-muted);
  }
  dd {
    min-width: 0;
    margin: 0;
    font-weight: var(--gl-weight-medium);
    text-align: right;
    overflow-wrap: anywhere;
  }
  small {
    display: block;
    margin-top: 2px;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
    font-weight: var(--gl-weight-regular);
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 8px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-pill);
    background: var(--gl-scrim);
    color: var(--gl-muted);
    font-weight: var(--gl-weight-semibold);
    font-size: var(--gl-size-small);
  }
  .pill i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--gl-mint);
  }
  /* Stacked above the pictures the facts pair up (InfoPanelRows), so the open details stay short. */
  @container (min-width: 721px) and (max-width: 1024px) {
    div {
      break-inside: avoid;
    }
  }
</style>
