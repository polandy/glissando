<script lang="ts">
  import type { BeatTick } from "./picture-changes-view";
  import { percentOf } from "./waveform-scale";

  /** The beats the pictures change on, along the waveform's foot; every fourth one taller. */
  let { ticks, durationMs }: { ticks: readonly BeatTick[]; durationMs: number } = $props();
</script>

{#if ticks.length > 0}
  <div class="beat-ticks" aria-hidden="true">
    {#each ticks as tick (tick.atMs)}
      <i class:bar={tick.bar} style:left={percentOf(tick.atMs, durationMs)}></i>
    {/each}
  </div>
{/if}

<style>
  .beat-ticks {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .beat-ticks i {
    position: absolute;
    bottom: 0;
    width: 1px;
    height: 8px;
    background: color-mix(in srgb, var(--gl-ink) 22%, transparent);
  }
  .beat-ticks i.bar {
    height: 14px;
    background: color-mix(in srgb, var(--gl-ink) 45%, transparent);
  }
</style>
