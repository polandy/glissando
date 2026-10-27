<script lang="ts">
  import Icon from "../../components/Icon.svelte";

  /** One of the info panel's Music, Mood or Look tiles (ADR-0048): a button with its label and a
   * chevron over its value and summary, never folded. */
  let {
    name,
    label,
    value,
    summary,
    onclick,
    swatchColour,
  }: {
    /** Which tile, as a class: "music", "mood", "look". */
    name: string;
    label: string;
    value: string;
    /** Empty: the value stands alone. */
    summary: string;
    onclick: () => void;
    /** The look tile's small colour swatch, before the value; omitted or null shows none. */
    swatchColour?: string | null;
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
  <span class="value">
    <b>
      {#if swatchColour}
        <span class="swatch" style:background={swatchColour}></span>
      {/if}
      <span class="text">{value}</span>
    </b>
    {#if summary !== ""}
      <small>{summary}</small>
    {/if}
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
    align-content: start;
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
  .value {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  .value b {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: var(--gl-weight-medium);
  }
  .value b .text {
    overflow-wrap: anywhere;
  }
  .swatch {
    flex: none;
    width: 18px;
    height: 12px;
    border-radius: 3px;
    border: 1px solid var(--gl-line);
  }
  .value small {
    display: block;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
</style>
