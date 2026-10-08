<script lang="ts">
  // Markup only: no props.
</script>

<!-- A .glissando file: the logo's three cards on a page. Decorative. -->
<svg class="glyph" viewBox="0 0 36 40" aria-hidden="true">
  <path class="page" d="M4 2h20l8 8v28H4z" />
  <path class="fold" d="M24 2v8h8" />
  <rect class="peach" x="9" y="20" width="11" height="9" rx="2" transform="rotate(-12 14 24)" />
  <rect class="mint" x="13" y="18" width="11" height="9" rx="2" transform="rotate(-3 18 22)" />
  <rect class="lemon" x="17" y="16" width="11" height="9" rx="2" transform="rotate(8 22 20)" />
</svg>

<style>
  .glyph {
    flex: none;
    width: 36px;
    height: 40px;
  }
  .page {
    fill: var(--gl-surface);
    stroke: var(--gl-faint);
    stroke-width: 1.5;
  }
  .fold {
    fill: none;
    stroke: var(--gl-faint);
    stroke-width: 1.5;
  }
  .peach {
    fill: var(--gl-logo-peach);
  }
  .mint {
    fill: var(--gl-logo-mint);
  }
  .lemon {
    fill: var(--gl-logo-lemon);
  }
</style>
