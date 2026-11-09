<script lang="ts">
  import Icon from "../../components/Icon.svelte";
</script>

<span class="mark grab" aria-hidden="true"><Icon name="grip" /></span>

<style>
  .mark {
    position: absolute;
    top: 5px;
    right: 5px;
    z-index: 2;
    display: none;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: var(--gl-radius-small);
    background: var(--gl-photo-badge);
    color: var(--gl-on-photo);
    backdrop-filter: blur(6px);
    opacity: 0;
    transition: opacity 0.12s;
    cursor: grab;
    pointer-events: none;
    --gl-icon-size: var(--gl-size-icon-small);
  }
  /* The grab handle for a mouse only; touch holds a tile to lift it. */
  @media (hover: hover) and (pointer: fine) {
    .mark {
      display: grid;
    }
    :global(.tile:hover) .mark,
    :global(.tile.selected) .mark,
    :global(.tile:focus-within) .mark {
      opacity: 1;
    }
  }
  /* Selecting several (dev-docs/app/slideshow-editing/SELECTING_SEVERAL.md, Selecting several): the check circle instead of the mark. */
  :global(.tile.selecting-mode) .mark {
    display: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .mark {
      transition: none;
    }
  }
</style>
