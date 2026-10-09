<script lang="ts">
  /** Dimmed where Immich cannot be used right now. */
  let { dimmed = false }: { dimmed?: boolean } = $props();
</script>

<!-- Immich, as four rings in the brand's colours. Decorative. -->
<svg class="glyph" class:dimmed viewBox="0 0 32 32" aria-hidden="true">
  <circle class="peach" cx="16" cy="10" r="5.5" />
  <circle class="mint" cx="22" cy="16" r="5.5" />
  <circle class="lemon" cx="16" cy="22" r="5.5" />
  <circle class="coral" cx="10" cy="16" r="5.5" />
</svg>

<style>
  .glyph {
    flex: none;
    width: 36px;
    height: 36px;
    fill: none;
    stroke-width: 2;
  }
  .dimmed {
    opacity: 0.5;
  }
  .peach {
    stroke: var(--gl-accent);
  }
  .mint {
    stroke: var(--gl-mint);
  }
  .lemon {
    stroke: var(--gl-lemon);
  }
  .coral {
    stroke: var(--gl-coral);
  }
</style>
