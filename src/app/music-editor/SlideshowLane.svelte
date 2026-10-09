<script lang="ts">
  import { MILLISECONDS_PER_SECOND } from "../../player";
  import { getTranslator } from "../i18n/context";
  import type { MusicEditorView } from "./music-editor-view";
  import { percentOf } from "./waveform-scale";

  /**
   * Under the waveform: where the pictures play against the track, a tick per slide change, and
   * the time they play on in silence past the excerpt's end.
   */
  let { music }: { music: MusicEditorView } = $props();

  const { t, formatDuration } = getTranslator();

  const pct = (ms: number) => percentOf(ms, music.durationMs);
  const runEndMs = $derived(Math.min(music.durationMs, music.startMs + music.slideshowMs));
  const outlastsExcerpt = $derived(music.startMs + music.slideshowMs > music.endMs);
</script>

<div class="label">
  <span>{t("music.slideshowLane", { count: music.pictureCount })}</span>
  <span class="mono">{formatDuration(music.slideshowMs / MILLISECONDS_PER_SECOND)}</span>
</div>
<div class="lane" aria-hidden="true">
  <div
    class="runs"
    style:left={pct(music.startMs)}
    style:width="calc({pct(runEndMs)} - {pct(music.startMs)})"
  >
    {#each music.slideChangesMs as changeMs (changeMs)}
      <i style:left="{((changeMs - music.startMs) / (runEndMs - music.startMs)) * 100}%"></i>
    {/each}
  </div>
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
