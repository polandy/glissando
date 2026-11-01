<script lang="ts">
  import { MILLISECONDS_PER_SECOND } from "../../player";
  import { getTranslator } from "../i18n/context";
  import type { PlaylistView } from "./playlist-view";
  import { songColour } from "./song-colour";
  import { percentOf } from "./waveform-scale";

  /**
   * The playlist and the slideshow on one time scale: each song a block from where it starts (a
   * repeated one marked "↻", ADR-0047), the crossfades hatched including at a repeat's loop
   * boundary (with the details; otherwise the blocks meet at the middle of each overlap), the
   * slideshow's end marked where it comes before the playlist's; under it, the pictures' changes
   * and, while the pictures outlast the playlist and it does not repeat, the time they would play
   * on in silence (ADR-0023, ADR-0047). What to do about that is the picture-length notice's.
   */
  let { playlist }: { playlist: PlaylistView } = $props();

  const { t, formatDuration } = getTranslator();
  const HALF = 2;

  const spanMs = $derived(Math.max(playlist.slideshowMs, playlist.playlistMs));
  const pct = (ms: number) => percentOf(ms, spanMs);
  const seconds = (ms: number) => ms / MILLISECONDS_PER_SECOND;
  const duration = (ms: number) => formatDuration(seconds(ms));
  const endsEarly = $derived(playlist.slideshowMs < playlist.playlistMs);
  /** The pictures outlast the playlist and it does not repeat (ADR-0047): by how much. */
  const short = $derived(playlist.overMs !== undefined);
  /** How long a song starting at `atMs` overlaps the one before; its number follows the overlap. */
  const overlapIntoMs = (atMs: number) =>
    playlist.crossfades.find((crossfade) => crossfade.atMs === atMs)?.ms ?? 0;
</script>

<div class="playlist-timeline">
  <div class="lane-label">
    <span>
      {t("music.playlistLane", {
        count: playlist.songCount,
        duration: duration(playlist.playlistMs),
      })}
    </span>
    {#if playlist.repeatMusic}
      <span>{t("music.playlistRepeats")}</span>
    {:else if playlist.details && playlist.songs.length > 1}
      <span>{playlist.crossfade ? t("music.crossfadesHatched") : t("music.sequence")}</span>
    {/if}
  </div>
  <div class="playlist-lane" aria-hidden="true">
    {#each playlist.songs as song (song.atMs)}
      <span
        class="block mono"
        class:unreached={!song.reached}
        class:meeting={!playlist.details}
        style:left={pct(song.laneAtMs)}
        style:width={pct(song.laneMs)}
        style:background={songColour(song.number)}
        ><span
          class="number"
          style:margin-left={percentOf(overlapIntoMs(song.atMs), song.excerptMs)}
          >{song.number}{song.repeated === true ? " ↻" : ""}</span
        ></span
      >
    {/each}
    {#each playlist.crossfades as crossfade (crossfade.atMs)}
      <span class="crossfade" style:left={pct(crossfade.atMs)} style:width={pct(crossfade.ms)}
      ></span>
    {/each}
    {#if endsEarly}
      <span class="end" style:left={pct(playlist.slideshowMs)} title={t("music.slideshowEnds")}
      ></span>
    {/if}
  </div>
  <div class="lane-label">
    <span>
      {t("music.slideshowLaneTotal", {
        count: playlist.slideChangesMs.length + 1,
        duration: duration(playlist.slideshowMs),
      })}
    </span>
  </div>
  <div class="slides" aria-hidden="true">
    <span class="runs" style:width={pct(playlist.slideshowMs)}></span>
    {#each playlist.slideChangesMs as atMs (atMs)}
      <i style:left={pct(atMs)}></i>
    {/each}
    {#if short}
      <span
        class="silent"
        style:left={pct(playlist.playlistMs)}
        style:width={pct(playlist.slideshowMs - playlist.playlistMs)}
      ></span>
    {/if}
  </div>
  <div class="scale mono" aria-hidden="true">
    <span>{duration(0)}</span><span>{duration(spanMs / HALF)}</span><span>{duration(spanMs)}</span>
  </div>
</div>

<style>
  .playlist-timeline {
    display: grid;
    gap: 6px;
  }
  .lane-label {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
  .playlist-lane {
    position: relative;
    height: 34px;
    border-radius: var(--gl-radius-small);
    background: var(--gl-hover);
  }
  .block {
    position: absolute;
    top: 4px;
    bottom: 4px;
    display: flex;
    align-items: center;
    padding: 0 6px;
    overflow: hidden;
    border-radius: var(--gl-radius-small);
    color: var(--gl-song-ink);
    font-size: var(--gl-size-caption);
    font-weight: var(--gl-weight-semibold);
    white-space: nowrap;
  }
  /* Without the crossfades, a thin line of the surface keeps blocks that meet apart. */
  .block.meeting {
    box-sizing: border-box;
    box-shadow: 0 0 0 1px var(--gl-surface);
  }
  .block.unreached {
    opacity: 0.35;
  }
  .crossfade {
    position: absolute;
    top: 0;
    bottom: 0;
    border-radius: var(--gl-radius-small);
    background: repeating-linear-gradient(
      90deg,
      color-mix(in srgb, var(--gl-song-ink) 40%, transparent) 0 1px,
      transparent 1px 4px
    );
  }
  .end {
    position: absolute;
    top: -4px;
    bottom: -4px;
    width: 2px;
    background: var(--gl-coral);
  }
  .slides {
    position: relative;
    height: 26px;
    overflow: hidden;
    border-radius: var(--gl-radius-small);
    background: var(--gl-hover);
  }
  .runs {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    background: color-mix(in srgb, var(--gl-mint) 45%, var(--gl-surface));
  }
  .slides i {
    position: absolute;
    top: 5px;
    bottom: 5px;
    width: 1px;
    background: color-mix(in srgb, var(--gl-ink) 35%, transparent);
  }
  .silent {
    position: absolute;
    top: 0;
    bottom: 0;
    background: repeating-linear-gradient(
      135deg,
      color-mix(in srgb, var(--gl-lemon) 75%, transparent) 0 4px,
      transparent 4px 8px
    );
  }
  .scale {
    display: flex;
    justify-content: space-between;
    color: var(--gl-muted);
    font-size: var(--gl-size-caption);
  }
</style>
