<script lang="ts">
  import { MILLISECONDS_PER_SECOND } from "../../player";
  import { getTranslator } from "../i18n/context";
  import { currentPictureSpan, pictureRunEndMs } from "./current-picture-span";
  import type { MusicEditorView } from "./music-editor-view";
  import { percentOf } from "./waveform-scale";

  /**
   * Under the waveform: where the pictures play against the song's track, a tick per slide change
   * (one off the beat stands out while the pictures change on the beat), and, past the last song's
   * excerpt, the time they play on in silence. A song the slideshow never reaches has none. While
   * `listeningPositionMs` falls in the song, the picture showing there lights up.
   */
  let {
    music,
    listeningPositionMs,
  }: { music: MusicEditorView; listeningPositionMs: number | null } = $props();

  const { t, formatDuration } = getTranslator();

  const pct = (ms: number) => percentOf(ms, music.durationMs);
  /** Where the slideshow ends, in the song's track time. */
  const slideshowEndMs = $derived(music.startMs + music.slideshowMs - music.atMs);
  const runEndMs = $derived(pictureRunEndMs(music));
  const outlastsExcerpt = $derived(music.last && slideshowEndMs > music.endMs);
  /** `atMs` of the run as a percentage of `.runs`'s own width, which spans the run alone. */
  const runPct = (atMs: number) => ((atMs - music.startMs) / (runEndMs - music.startMs)) * 100;
  const currentSpan = $derived(
    listeningPositionMs === null ? null : currentPictureSpan(music, listeningPositionMs),
  );
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
      {#if currentSpan !== null}
        <div
          class="current"
          style:left="{runPct(currentSpan.startMs)}%"
          style:width="{runPct(currentSpan.endMs) - runPct(currentSpan.startMs)}%"
        ></div>
      {/if}
      {#each music.slideChanges as change (change.atMs)}
        <i class:off-beat={change.offBeat} style:left="{runPct(change.atMs)}%"></i>
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
  /* The picture showing at the playhead, under the ticks. */
  .current {
    position: absolute;
    top: 0;
    bottom: 0;
    background: color-mix(in srgb, var(--gl-mint) 85%, var(--gl-ink) 10%);
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
