<script lang="ts">
  /**
   * A picture still being imported: shimmers in the tiles' place, with a running mint bar for the
   * one file being read now (IMPORT_ARRANGING.md, Placeholders). Not focusable, never selectable,
   * carries no number.
   */
  let { active = false }: { active?: boolean } = $props();
</script>

<li class="placeholder" aria-hidden="true">
  {#if active}
    <span class="bar"><i></i></span>
  {/if}
</li>

<style>
  .placeholder {
    position: relative;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    border-radius: var(--gl-radius-tile);
    background: var(--gl-hover);
  }
  .placeholder::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(100deg, transparent 30%, var(--gl-scrim) 50%, transparent 70%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite linear;
  }
  @keyframes shimmer {
    to {
      background-position: -200% 0;
    }
  }
  .bar {
    position: absolute;
    left: 10%;
    right: 10%;
    bottom: 10px;
    z-index: 1;
    height: 4px;
    overflow: hidden;
    border-radius: 2px;
    background: var(--gl-photo-badge);
  }
  .bar i {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 40%;
    border-radius: 2px;
    background: var(--gl-mint);
    animation: run 1.2s infinite ease-in-out;
  }
  @keyframes run {
    0% {
      left: -40%;
    }
    100% {
      left: 100%;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .placeholder::after,
    .bar i {
      animation: none;
    }
  }
</style>
