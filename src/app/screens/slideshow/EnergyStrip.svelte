<script lang="ts">
  import { getTranslator } from "../../i18n/context";
  import type { EnergyStripGeometry } from "./energy-strip-geometry";

  const VIEW_WIDTH = 100;
  const VIEW_HEIGHT = 32;
  const PLAYHEAD_RADIUS = 1.6;
  const PLAYHEAD_SWEEP_SECONDS = 3;

  /**
   * The Mood sheet's energy strip (ADR-0046), under the preview while "Follow the music's energy"
   * is on: the whole slideshow's energy curve as an area, a tick at every picture change, a dashed
   * line at every lift, the preview's stretch shaded with a sweeping playhead, and the "quiet →
   * longer"/"loud → quicker" legend. Decorative (`aria-hidden`): the "What it sets" rows next to it
   * say the same in words.
   */
  let { geometry }: { geometry: EnergyStripGeometry } = $props();

  function toX(fraction: number): number {
    return fraction * VIEW_WIDTH;
  }
  function toY(energy: number): number {
    return VIEW_HEIGHT - energy * VIEW_HEIGHT;
  }

  const areaPath = $derived.by(() => {
    const first = geometry.areaPoints[0];
    const last = geometry.areaPoints.at(-1);
    if (first === undefined || last === undefined) {
      return "";
    }
    return [
      `M ${toX(first.x)} ${VIEW_HEIGHT}`,
      ...geometry.areaPoints.map((point) => `L ${toX(point.x)} ${toY(point.y)}`),
      `L ${toX(last.x)} ${VIEW_HEIGHT}`,
      "Z",
    ].join(" ");
  });

  const previewStartX = $derived(toX(geometry.previewStretch.startFraction));
  const previewEndX = $derived(toX(geometry.previewStretch.endFraction));

  const { t } = getTranslator();
</script>

<figure class="strip">
  <svg viewBox="0 0 {VIEW_WIDTH} {VIEW_HEIGHT}" preserveAspectRatio="none" aria-hidden="true">
    <rect
      class="preview-stretch"
      x={previewStartX}
      y="0"
      width={previewEndX - previewStartX}
      height={VIEW_HEIGHT}
    />
    <path class="area" d={areaPath} />
    {#each geometry.tickFractions as fraction (fraction)}
      <line class="tick" x1={toX(fraction)} x2={toX(fraction)} y1="0" y2={VIEW_HEIGHT} />
    {/each}
    {#each geometry.liftFractions as fraction (fraction)}
      <line class="lift" x1={toX(fraction)} x2={toX(fraction)} y1="0" y2={VIEW_HEIGHT} />
    {/each}
    <circle class="playhead" cy={VIEW_HEIGHT / 2} r={PLAYHEAD_RADIUS}>
      <animate
        attributeName="cx"
        values="{previewStartX};{previewEndX};{previewStartX}"
        dur="{PLAYHEAD_SWEEP_SECONDS}s"
        repeatCount="indefinite"
      />
    </circle>
  </svg>
  <figcaption>
    <span>{t("mood.energyStripQuiet")}</span>
    <span>{t("mood.energyStripLoud")}</span>
  </figcaption>
</figure>

<style>
  .strip {
    display: grid;
    gap: 4px;
    margin: 0;
  }
  svg {
    display: block;
    width: 100%;
    height: 32px;
    overflow: visible;
  }
  .preview-stretch {
    fill: var(--gl-accent-halo);
  }
  .area {
    fill: var(--gl-accent-tint);
    stroke: var(--gl-accent);
    stroke-width: 0.6;
  }
  .tick {
    stroke: var(--gl-line);
    stroke-width: 0.4;
  }
  .lift {
    stroke: var(--gl-accent);
    stroke-width: 0.6;
    stroke-dasharray: 2 1.5;
  }
  .playhead {
    fill: var(--gl-accent);
  }
  figcaption {
    display: flex;
    justify-content: space-between;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
</style>
