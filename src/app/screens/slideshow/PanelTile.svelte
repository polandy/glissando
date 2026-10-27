<script lang="ts">
  import type { Snippet } from "svelte";
  import Icon from "../../components/Icon.svelte";

  /** One of the info panel's Music, Mood or Look tiles (ADR-0048): a button with its label and a
   * chevron over its value and summary, never folded. */
  let {
    name,
    label,
    value,
    summary,
    onclick,
    swatch,
  }: {
    /** Which tile, as a class: "music", "mood", "look". */
    name: string;
    label: string;
    value: string;
    /** Empty: the value stands alone. */
    summary: string;
    onclick: () => void;
    /** The look tile's colour-graded swatch, beside the value. */
    swatch?: Snippet;
  } = $props();

  let button: HTMLButtonElement;

  export function focus(): void {
    button.focus();
  }
</script>

<button bind:this={button} type="button" class="tile {name}" {onclick}>
  <span class="head">
    {label}
    <Icon name="chevronRight" />
  </span>
  <span class="body">
    {#if swatch}{@render swatch()}{/if}
    <span class="value">
      <b>{value}</b>
      {#if summary !== ""}
        <small>{summary}</small>
      {/if}
    </span>
  </span>
</button>

<style>
  .tile {
    display: grid;
    gap: 6px;
    min-width: 0;
    padding: 10px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
    background: var(--gl-raised);
    color: var(--gl-ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .tile:hover {
    background: var(--gl-hover);
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
  .body {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
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
    overflow: hidden;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
