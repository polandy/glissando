<script lang="ts">
  import Icon from "../../components/Icon.svelte";

  /** A strip tile's order number pill; a clip adds a play glyph and its excerpt length beside it. */
  let {
    number,
    clipLength,
    selected,
  }: {
    /** The position in play order, from 1. */
    number: number;
    /** The clip's formatted excerpt length; null for a still. */
    clipLength: string | null;
    /** The tile is selected: the pill takes the accent. */
    selected: boolean;
  } = $props();
</script>

<span class="number mono" class:selected aria-hidden="true">
  {number}{#if clipLength !== null}<span class="clip-divider"></span><Icon name="play" /><span>
      {clipLength}
    </span>{/if}
</span>

<style>
  .number {
    position: absolute;
    left: 6px;
    top: 6px;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 1px 6px;
    color: var(--gl-on-photo);
    font-weight: var(--gl-weight-medium);
    font-size: var(--gl-size-caption);
    text-align: left;
    --gl-icon-size: var(--gl-size-caption);
    border-radius: var(--gl-radius-small);
    background: var(--gl-photo-badge);
  }
  .clip-divider {
    align-self: stretch;
    width: 1px;
    margin: 3px 1px;
    background: currentColor;
    opacity: 0.5;
  }
  /* The selected tile's order number, in the accent (docs/dev/app/slideshow-editing/REMOVE_SELECT_REORDER.md, Select and reorder). */
  .number.selected {
    background: var(--gl-accent);
    color: var(--gl-accent-ink);
  }
</style>
