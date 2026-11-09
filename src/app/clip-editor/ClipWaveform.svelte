<script lang="ts">
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import WaveBars from "../music-editor/WaveBars.svelte";
  import WaveReading from "../music-editor/WaveReading.svelte";
  import { waveformPeaks } from "../music-editor/waveform-peaks";
  import { barCountFor } from "../music-editor/waveform-scale";
  import type { ClipSoundWave } from "./clip-sound-wave";
  import type { Excerpt } from "./clip-excerpt";

  /**
   * The excerpt strip's sound: bars inside the chosen excerpt in the ink colour, outside in the
   * faint one, growing left to right while the sound is still being read (its peaks arrive with
   * zeros for the unread part); every bar faint while the clip's sound is off; a caption instead
   * of bars when the clip carries no sound track, and one with a warning icon when its sound
   * cannot be read, so neither looks like a strip still reading.
   */
  let {
    wave,
    excerpt,
    sourceMs,
    soundOff,
    width,
  }: {
    wave: ClipSoundWave | null;
    excerpt: Excerpt;
    sourceMs: number;
    soundOff: boolean;
    width: number;
  } = $props();

  const bars = $derived.by(() => {
    const count = barCountFor(width);
    const heights =
      wave?.kind === "peaks" ? waveformPeaks(wave.peaks, count) : Array<number>(count).fill(0);
    return heights.map((height, index) => {
      const atMs = ((index + 0.5) / count) * sourceMs;
      return { share: height, inside: atMs >= excerpt.startMs && atMs <= excerpt.endMs };
    });
  });

  const { t } = getTranslator();
</script>

<div class="wave">
  {#if wave?.kind === "no sound"}
    <p class="empty">{t("clip.noSound")}</p>
  {:else if wave?.kind === "unreadable"}
    <p class="empty">
      <span class="warn"><Icon name="alert" /></span>{t("clip.soundUnreadable")}
    </p>
  {:else if wave === null}
    <WaveReading text={t("clip.soundReading")} />
  {:else}
    <WaveBars {bars} muted={soundOff} />
  {/if}
</div>

<style>
  .wave {
    position: absolute;
    inset: 4px 0;
  }
  .empty {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-caption);
    pointer-events: none;
  }
  .warn {
    display: flex;
    color: var(--gl-warn-icon);
    --gl-icon-size: var(--gl-size-icon-small);
  }
</style>
