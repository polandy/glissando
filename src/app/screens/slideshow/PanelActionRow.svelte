<script lang="ts">
  import Icon from "../../components/Icon.svelte";

  /**
   * A row of the info panel that opens an editor: a button spanning the row with its label, the
   * current value over a summary, and the action ("Bearbeiten", "Ändern").
   */
  let {
    name,
    label,
    value,
    summary,
    action,
    onclick,
    pill = false,
    own = false,
  }: {
    /** Which row, as a class: "music", "transitions". */
    name: string;
    label: string;
    value: string;
    /** Empty: the value stands alone. */
    summary: string;
    action: string;
    onclick: () => void;
    /** The value as an accent-tintable chip (the look row) instead of plain bold text. */
    pill?: boolean;
    /** The chip is accent-tinted: the setting is the user's own choice, not the default. */
    own?: boolean;
  } = $props();

  let button: HTMLButtonElement;

  export function focus(): void {
    button.focus();
  }
</script>

<button bind:this={button} type="button" class="row-action {name}" {onclick}>
  <span class="label">{label}</span>
  <span class="value">
    {#if pill}
      <span class="chip" class:own>{value}</span>
    {:else}
      <b>{value}</b>
    {/if}
    {#if summary !== ""}
      <small>{summary}</small>
    {/if}
  </span>
  <span class="go">{action}<Icon name="chevronRight" /></span>
</button>

<style>
  .row-action {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 4px 14px;
    width: calc(100% + 8px);
    margin: 0 -4px;
    padding: 9px 10px 9px 12px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
    background: var(--gl-raised);
    color: var(--gl-ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .row-action:hover {
    background: var(--gl-hover);
  }
  .label {
    color: var(--gl-muted);
  }
  .value {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  .value b {
    overflow: hidden;
    font-weight: var(--gl-weight-medium);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .value small {
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
  .chip {
    justify-self: start;
    padding: 3px 9px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-pill);
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
    font-weight: var(--gl-weight-semibold);
    white-space: nowrap;
  }
  .chip.own {
    border-color: transparent;
    background: color-mix(in srgb, var(--gl-accent) 28%, var(--gl-surface));
    color: var(--gl-ink);
  }
  .go {
    display: flex;
    align-items: center;
    gap: 2px;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
    font-weight: var(--gl-weight-semibold);
  }
</style>
