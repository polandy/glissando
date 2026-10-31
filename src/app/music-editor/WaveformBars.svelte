<script lang="ts">
  import type { MusicEditorView } from "./music-editor-view";
  import { waveformPeaks } from "./waveform-peaks";
  import { getTranslator } from "../i18n/context";
  import { barCountFor } from "./waveform-scale";
  import { envelopePoints, waveBars } from "./wave-view";
  import WaveBars from "./WaveBars.svelte";
  import WaveReading from "./WaveReading.svelte";

  /**
   * The whole track's peaks as bars. With the details, the bars shrink by the fade envelope
   * inside the excerpt and the envelope is drawn as a line over them.
   */
  let {
    music,
    peaks,
    width,
    details,
  }: {
    music: MusicEditorView;
    /** Fine peaks of the whole track, 0..1; null while the track is decoded. */
    peaks: Float32Array | null;
    /** The waveform's width in CSS px, which sets how many bars fit. */
    width: number;
    /** The volume line and the fade-shrunk bars. */
    details: boolean;
  } = $props();

  const bars = $derived.by(() => {
    const count = barCountFor(width);
    const heights = peaks === null ? Array<number>(count).fill(0) : waveformPeaks(peaks, count);
    return waveBars(heights, music, details);
  });
  const { t } = getTranslator();
  const envelope = $derived(envelopePoints(music));
</script>

{#if peaks === null}
  <WaveReading text={t("music.waveformReading")} />
{:else}
  <WaveBars {bars}>
    {#if details}
      <polyline class="envelope" points={envelope} />
    {/if}
  </WaveBars>
{/if}

<style>
  .envelope {
    fill: none;
    stroke: var(--gl-accent);
    stroke-width: 2.2;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }
</style>
