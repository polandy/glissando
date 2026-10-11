<script lang="ts">
  import { MILLISECONDS_PER_SECOND } from "../../player";
  import { getTranslator } from "../i18n/context";
  import type { MusicEditorView } from "./music-editor-view";
  import { percentOf } from "./waveform-scale";

  /**
   * Under the waveform: where the pictures play against the song's track, a tick per slide change
   * (one off the beat stands out while the pictures change on the beat), and, past the last song's
   * excerpt, the time they play on in silence. A song the slideshow never reaches has none.
   */
  let { music }: { music: MusicEditorView } = $props();

  const { t, formatDuration } = getTranslator();

  const pct = (ms: number) => percentOf(ms, music.durationMs);
  /** Where the slideshow ends, in the song's track time. */
  const slideshowEndMs = $derived(music.startMs + music.slideshowMs - music.atMs);
  const runEndMs = $derived(Math.min(music.durationMs, slideshowEndMs));
  const outlastsExcerpt = $derived(music.last && slideshowEndMs > music.endMs);
</script>

<div class="label">
  <span>{t("music.slideshowLane", { count: music.pictureCount })}</span>
  <span class="mono">{formatDuration(music.slideshowMs / MILLISECONDS_PER_SECOND)}</span>
</div>
<div class="lane" aria-hidden="true">
  {#if music.reached}
    <div
      class="runs"
      style:left={pct(music.startMs)}
      style:width="calc({pct(runEndMs)} - {pct(music.startMs)})"
    >
      {#each music.slideChanges as change (change.atMs)}
        <i
          class:off-beat={change.offBeat}
          style:left="{((change.atMs - music.startMs) / (runEndMs - music.startMs)) * 100}%"
        ></i>
      {/each}
    </div>
  {/if}
  {#if outlastsExcerpt}
    <div
      class="over"
      style:left={pct(music.endMs)}
      style:width="calc({pct(runEndMs)} - {pct(music.endMs)})"
    ></div>
  {/if}
</div>

<style>
  .label {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
  .lane {
    position: relative;
    height: 26px;
    border-radius: var(--gl-radius-small);
    background: var(--gl-hover);
  }
  .runs {
    position: absolute;
    top: 0;
    bottom: 0;
    overflow: hidden;
    border-radius: var(--gl-radius-small);
    background: color-mix(in srgb, var(--gl-mint) 45%, var(--gl-surface));
  }
  .runs i {
    position: absolute;
    top: 5px;
    bottom: 5px;
    width: 1px;
    background: color-mix(in srgb, var(--gl-ink) 35%, transparent);
  }
  .runs i.off-beat {
    width: 2px;
    background: var(--gl-coral);
  }
  /* The pictures that play on after the music. */
  .over {
    position: absolute;
    top: 0;
    bottom: 0;
    border-radius: 0 var(--gl-radius-small) var(--gl-radius-small) 0;
    background: repeating-linear-gradient(
      135deg,
      color-mix(in srgb, var(--gl-lemon) 75%, transparent) 0 4px,
      transparent 4px 8px
    );
  }
</style>
