<script lang="ts">
  import Icon from "../../components/Icon.svelte";
  import type { IconName } from "../../../ui-kit/icons";

  /** One of the info panel's Music, Mood or Look tiles (ADR-0048): a button with its label and a
   * chevron over its value and summary, never folded. On a stacked layout it shrinks to a chip:
   * the icon beside the label over a two-line value, and only the mood keeps its summary. */
  let {
    name,
    icon,
    label,
    value,
    summary,
    onclick,
    swatchColour,
  }: {
    /** Which tile, as a class: "music", "mood", "look". */
    name: string;
    /** Drawn before the text on the stacked layout's chip. */
    icon: IconName;
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
    <span class="label"><span class="icon"><Icon name={icon} /></span>{label}</span>
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
    position: relative;
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
  .label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }
  .icon {
    display: none;
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
    display: -webkit-box;
    overflow: hidden;
    overflow-wrap: anywhere;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }
  .swatch {
    flex: none;
    width: 18px;
    height: 12px;
    border-radius: 3px;
    border: 1px solid var(--gl-line);
  }
  .value small {
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }
  @container (max-width: 1024px) {
    .tile {
      gap: 2px;
      min-height: 52px;
      padding: 7px 9px;
    }
    .icon {
      display: inline-flex;
    }
    .head {
      justify-content: flex-start;
      font-size: var(--gl-size-small);
      font-weight: var(--gl-weight-semibold);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .head > :global(svg) {
      display: none;
    }
    .value b {
      line-height: 1.25;
    }
    /* Out of sight but still in the button's name, so "Add music" is read out. */
    .tile:not(.mood) .value small {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  }
</style>
