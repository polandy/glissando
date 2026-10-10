<script lang="ts">
  import Icon from "../../components/Icon.svelte";

  /**
   * A strip tile's check circle (dev-docs/APP.md, Selecting several): shown only while selecting
   * several, filled in the accent once the tile is picked.
   */
  let { selecting, selected }: { selecting: boolean; selected: boolean } = $props();
</script>

<span class="check" class:shown={selecting} class:selected aria-hidden="true"
  ><Icon name="check" /></span
>

<style>
  .check {
    position: absolute;
    top: 6px;
    right: 6px;
    z-index: 2;
    display: none;
    place-items: center;
    width: 22px;
    height: 22px;
    border: 2px solid var(--gl-on-photo);
    border-radius: var(--gl-radius-pill);
    background: var(--gl-photo-badge);
    color: transparent;
    --gl-icon-size: 13px;
  }
  .check.shown {
    display: grid;
  }
  .check.selected {
    border-color: var(--gl-accent);
    background: var(--gl-accent);
    color: var(--gl-accent-ink);
  }
  /* A bold check: the icon set's hairline stroke vanishes at this size on the accent. */
  .check :global(svg) {
    stroke-width: 3.2;
  }
</style>
