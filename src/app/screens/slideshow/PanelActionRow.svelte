<script lang="ts">
  import Icon from "../../components/Icon.svelte";

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
    /** Empty: the value stands alone. */
    summary: string;
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
    {#if summary !== ""}
      <span class="summary">{summary}</span>
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
  .go {
    display: flex;
    align-items: center;
    color: var(--gl-muted);
  }
</style>
