<script lang="ts">
  import { musicGainAt } from "../../player";
  import type { MusicEditorView } from "./music-editor-view";
  import { waveformPeaks } from "./waveform-peaks";
  import { barCountFor } from "./waveform-scale";
  import { VIEW_HEIGHT, VIEW_WIDTH } from "./wave-view";
  import WaveBars from "./WaveBars.svelte";

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

  /** Bars inside a fade never shrink below this share, so the shape stays readable. */
  const MIN_FADED_SHARE = 0.06;
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
      return { share: height * gain, inside };
    });
  });
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

<WaveBars {bars}>
  <polyline class="envelope" points={envelope} />
</WaveBars>

<style>
  .envelope {
    fill: none;
    stroke: var(--gl-accent);
    stroke-width: 2.2;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }
</style>
