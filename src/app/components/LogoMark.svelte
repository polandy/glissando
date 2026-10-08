<script lang="ts">
  // Markup only: no props.
</script>

<!-- The brand's three stacked cards (assets/brand/logo-mark.svg), painted from the theme's tokens.
     Decorative: the wordmark beside it names the app. -->
<svg class="mark" viewBox="0 0 120 100" fill="none" aria-hidden="true">
  <g transform="rotate(-14 36 56)">
    <rect class="card peach" x="10" y="36" width="52" height="40" rx="9" />
  </g>
  <g transform="rotate(-2 56 44)">
    <rect class="card mint" x="30" y="24" width="52" height="40" rx="9" />
  </g>
  <g transform="rotate(10 78 32)">
    <rect class="card lemon" x="52" y="12" width="52" height="40" rx="9" />
    <circle class="motif" cx="66" cy="25" r="5" />
    <path class="motif" d="M60 46 L72 33 L80 40 L86 35 L96 46 Z" />
  </g>
</svg>

<style>
  .mark {
    flex: none;
    width: 26px;
    height: 22px;
  }
  .card {
    stroke: var(--gl-logo-outline);
    stroke-width: 4;
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
  .motif {
    fill: var(--gl-logo-outline);
  }
</style>
