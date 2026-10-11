<script lang="ts">
  import type { BeatTick } from "./picture-changes-view";
  import { percentOf } from "./waveform-scale";

  /**
   * The beats the pictures change on, hanging from the waveform's foot into the gap above the
   * ruler; every fourth one longer.
   */
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
  /* The ruler keeps an 8 px gap below the waveform; the ticks fill it. */
  .beat-ticks {
    position: absolute;
    top: 100%;
    right: 0;
    left: 0;
    height: 8px;
    pointer-events: none;
  }
  .beat-ticks i {
    position: absolute;
    top: 0;
    width: 1px;
    height: 4px;
    background: color-mix(in srgb, var(--gl-ink) 30%, transparent);
  }
  .beat-ticks i.bar {
    height: 8px;
    background: color-mix(in srgb, var(--gl-ink) 60%, transparent);
  }
</style>
