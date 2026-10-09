<script lang="ts">
  import { musicGainAt } from "../../player";
  import type { MusicEditorView } from "./music-editor-view";
  import { waveformPeaks } from "./waveform-peaks";
  import { barCountFor } from "./waveform-scale";

  /**
   * The whole track's peaks as bars, shrunk by the fade envelope inside the excerpt, with the
   * envelope drawn as a line over them.
   */
  let {
    music,
    peaks,
    width,
  }: {
    music: MusicEditorView;
    /** Fine peaks of the whole track, 0..1; null while the track is decoded. */
    peaks: Float32Array | null;
    /** The waveform's width in CSS px, which sets how many bars fit. */
    width: number;
  } = $props();

  /** The SVG's own units; it stretches to the waveform's box. */
  const VIEW_WIDTH = 1000;
  const VIEW_HEIGHT = 100;
  /** Bars inside a fade never shrink below this share, so the shape stays readable. */
  const MIN_FADED_SHARE = 0.06;
  /** A silent bar still shows as a line. */
  const MIN_BAR_HEIGHT = 1.5;
  /** Share of a bar's slot the bar fills. */
  const BAR_FILL = 0.64;
  /** Where the envelope line rests at full volume, just inside the top. */
  const ENVELOPE_TOP = 2;

  const bars = $derived.by(() => {
    const count = barCountFor(width);
    const heights = peaks === null ? Array<number>(count).fill(0) : waveformPeaks(peaks, count);
    return heights.map((height, index) => {
      const atMs = ((index + 0.5) / count) * music.durationMs;
      const inside = atMs >= music.startMs && atMs <= music.audibleEndMs;
      const gain = inside
        ? Math.max(MIN_FADED_SHARE, musicGainAt(music.timing, atMs - music.startMs))
        : 1;
      return {
        x: (index / count) * VIEW_WIDTH,
        height: Math.max(MIN_BAR_HEIGHT, height * gain * VIEW_HEIGHT),
        inside,
      };
    });
  });
  const barWidth = $derived((VIEW_WIDTH / barCountFor(width)) * BAR_FILL);
  const envelope = $derived.by(() => {
    const { startMs, endMs, fadeInMs, fadeOutMs } = music.timing;
    const x = (ms: number) => (ms / music.durationMs) * VIEW_WIDTH;
    return [
      [x(startMs), fadeInMs > 0 ? VIEW_HEIGHT : ENVELOPE_TOP],
      [x(startMs + fadeInMs), ENVELOPE_TOP],
      [x(endMs - fadeOutMs), ENVELOPE_TOP],
      [x(endMs), fadeOutMs > 0 ? VIEW_HEIGHT : ENVELOPE_TOP],
    ]
      .map(([px, py]) => `${px},${py}`)
      .join(" ");
  });
</script>

<svg
  class="bars"
  viewBox="0 0 {VIEW_WIDTH} {VIEW_HEIGHT}"
  preserveAspectRatio="none"
  aria-hidden="true"
>
  {#each bars as bar, index (index)}
    <rect
      class:inside={bar.inside}
      x={bar.x + (VIEW_WIDTH / bars.length - barWidth) / 2}
      y={(VIEW_HEIGHT - bar.height) / 2}
      width={barWidth}
      height={bar.height}
    />
  {/each}
  <polyline class="envelope" points={envelope} />
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
  .envelope {
    fill: none;
    stroke: var(--gl-accent);
    stroke-width: 2.2;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }
</style>
