<script lang="ts">
  import Icon from "../../components/Icon.svelte";

  /** Between two parts of the summary; the spaces keep the parts apart in the accessible name. */
  const SEPARATOR = " · ";

  /**
   * A row of the info panel that opens an editor: a button spanning the row with its label, the
   * current value over a summary, and a chevron.
   */
  let {
    name,
    label,
    value,
    summary,
    onclick,
  }: {
    /** Which row, as a class: "music", "transitions". */
    name: string;
    label: string;
    value: string;
    /** Shown under the value, parted by dots; empty: the value stands alone. */
    summary: readonly string[];
    onclick: () => void;
  } = $props();

  let button: HTMLButtonElement;

  export function focus(): void {
    button.focus();
  }
</script>

<button bind:this={button} type="button" class="row-action {name}" {onclick}>
  <span class="text">
    <span class="label">{label}</span>
    <span class="value">{value}</span>
    {#if summary.length > 0}
      <span class="summary">
        {#each summary as part, index (index)}{#if index > 0}<span class="separator"
              >{SEPARATOR}</span
            >{/if}{part}{/each}
      </span>
    {/if}
  </span>
  <span class="go"><Icon name="chevronRight" /></span>
</button>

<style>
  .row-action {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 4px;
    border: 0;
    border-top: 1px solid var(--gl-line);
    border-radius: 0;
    background: none;
    color: var(--gl-ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .row-action:first-child {
    border-top: 0;
  }
  .row-action:hover {
    background: var(--gl-hover);
  }
  .text {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  .label {
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
  .value {
    overflow-wrap: anywhere;
    font-weight: var(--gl-weight-semibold);
  }
  .summary {
    display: block;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
  /* The font's "·" and spaces are narrow; at the small size a bare " · " runs together. */
  .separator {
    padding: 0 3px;
  }
  .go {
    display: flex;
    align-items: center;
    color: var(--gl-muted);
  }
</style>
