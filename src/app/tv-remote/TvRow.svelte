<script lang="ts">
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";

  /** The info panel's row under the share row (tv_remote/IN_THE_APP.md): opens "Show on TV". */
  let { onOpen }: { onOpen: () => void } = $props();

  const { t } = getTranslator();

  let button = $state<HTMLButtonElement>();

  /** The sheet closed: focus goes back to the row it was opened from. */
  export function focus(): void {
    button?.focus();
  }
</script>

<button bind:this={button} class="tv-row" type="button" onclick={onOpen}>
  <Icon name="tv" />
  <span class="text">
    <strong>{t("tvSheet.rowTitle")}</strong>
    <small>{t("tvSheet.rowText")}</small>
  </span>
  <span class="go"><Icon name="chevronRight" /></span>
</button>

<style>
  .tv-row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
    background: var(--gl-surface);
    color: var(--gl-ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .tv-row:hover {
    background: var(--gl-hover);
  }
  .text {
    display: grid;
    flex: 1;
    gap: 2px;
    min-width: 0;
    font-size: var(--gl-size-meta);
  }
  strong {
    font-weight: var(--gl-weight-semibold);
  }
  small {
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
  .go {
    display: flex;
    flex: none;
    color: var(--gl-muted);
  }
</style>
