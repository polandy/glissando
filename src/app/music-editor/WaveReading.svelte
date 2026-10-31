<script lang="ts">
  /**
   * What a waveform shows while its peaks are still being read: the text, shimmering, filling
   * the space the bars will take. Reduced motion stops the shimmer.
   */
  let { text }: { text: string } = $props();
</script>

<p class="reading" role="status">{text}</p>

<style>
  .reading {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-caption);
    background: linear-gradient(
      90deg,
      transparent 0%,
      color-mix(in srgb, var(--gl-faint) 30%, transparent) 50%,
      transparent 100%
    );
    background-size: 200% 100%;
    animation: reading-shimmer 1.6s linear infinite;
  }
  @keyframes reading-shimmer {
    from {
      background-position: 200% 0;
    }
    to {
      background-position: -200% 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .reading {
      animation: none;
    }
  }
</style>
