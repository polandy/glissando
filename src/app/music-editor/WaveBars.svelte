<script lang="ts">
  import type { Snippet } from "svelte";
  import { BAR_FILL, MIN_BAR_HEIGHT, VIEW_HEIGHT, VIEW_WIDTH } from "./wave-view";

  /**
   * A row of bars in a shared SVG box, from each bar's height share (0..1, a silent bar still a
   * thin line) and whether it lies inside the caller's selection. `muted` draws every bar in the
   * outside style, e.g. a clip with its sound switched off. `children`, when given, draws more
   * shapes over the bars in the same SVG (the music editor's fade envelope).
   */
  let {
    bars,
    muted = false,
    children,
  }: {
    bars: readonly { share: number; inside: boolean }[];
    muted?: boolean;
    children?: Snippet;
  } = $props();

  const barWidth = $derived((VIEW_WIDTH / bars.length) * BAR_FILL);
</script>

<svg
  class="bars"
  viewBox="0 0 {VIEW_WIDTH} {VIEW_HEIGHT}"
  preserveAspectRatio="none"
  aria-hidden="true"
>
  {#each bars as bar, index (index)}
    {@const height = Math.max(MIN_BAR_HEIGHT, bar.share * VIEW_HEIGHT)}
    <rect
      class:inside={bar.inside && !muted}
      x={(index / bars.length) * VIEW_WIDTH + (VIEW_WIDTH / bars.length - barWidth) / 2}
      y={(VIEW_HEIGHT - height) / 2}
      width={barWidth}
      {height}
    />
  {/each}
  {@render children?.()}
</svg>

<style>
  .bars {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .bars rect {
    fill: var(--gl-faint);
    fill-opacity: 0.45;
  }
  .bars rect.inside {
    fill: var(--gl-ink);
    fill-opacity: 0.78;
  }
</style>
