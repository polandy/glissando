<script lang="ts">
  import { ICONS, type IconDefinition, type IconName } from "../icons";

  let { name }: { name: IconName } = $props();

  const icon: IconDefinition = $derived(ICONS[name]);
</script>

<!-- Decorative: the button or text next to an icon carries its accessible name. -->
<svg class="icon" class:filled={icon.filled} viewBox="0 0 24 24" aria-hidden="true">
  {#each icon.shapes as shape, index (index)}
    {#if shape.kind === "path"}
      <path d={shape.d} />
    {:else if shape.kind === "circle"}
      <circle cx={shape.cx} cy={shape.cy} r={shape.r} />
    {:else}
      <rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx} />
    {/if}
  {/each}
</svg>

<style>
  .icon {
    flex: none;
    width: var(--gl-icon-size, var(--gl-size-icon));
    height: var(--gl-icon-size, var(--gl-size-icon));
    fill: none;
    stroke: currentColor;
    stroke-width: var(--gl-icon-stroke);
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .filled {
    fill: currentColor;
    stroke: none;
  }
</style>
