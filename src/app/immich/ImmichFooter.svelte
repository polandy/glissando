<script lang="ts">
  import { keepToastsClear } from "../components/toast-clearance";
  import { getTranslator } from "../i18n/context";
  import type { SelectionSummary } from "./immich-view";

  /** The browser's bottom bar: what is selected, Clear selection and Add n. */
  let {
    summary,
    onClear,
    onAdd,
  }: { summary: SelectionSummary; onClear: () => void; onAdd: () => void } = $props();

  const { t } = getTranslator();
</script>

<div class="actions" use:keepToastsClear>
  <span class="summary">
    {#if summary.kind === "hint"}
      {t("immich.pickHint")}
    {:else}
      <b class="mono">{summary.count}</b>
      {t("immich.selected")}
      {#if summary.albums !== null}{t("immich.fromAlbums", { count: summary.albums })}{/if}
    {/if}
  </span>
  {#if summary.kind === "count"}
    <button class="btn ghost" type="button" onclick={onClear}>{t("immich.clear")}</button>
    <button class="btn primary" type="button" onclick={onAdd}>
      {t("immich.add", { count: summary.count })}
    </button>
  {:else}
    <button class="btn primary" type="button" disabled>{t("immich.addNothing")}</button>
  {/if}
</div>

<style>
  .actions {
    position: sticky;
    bottom: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: flex-end;
    align-items: center;
    padding: 12px 24px calc(12px + env(safe-area-inset-bottom));
    border-top: 1px solid var(--gl-line);
    background: var(--gl-surface);
  }
  .summary {
    margin-right: auto;
    color: var(--gl-muted);
    font-size: var(--gl-size-label);
  }
  .summary b {
    color: var(--gl-ink);
  }
  @container (max-width: 720px) {
    .actions {
      padding-inline: 16px;
    }
    .actions .btn.primary {
      flex: 1;
    }
  }
</style>
