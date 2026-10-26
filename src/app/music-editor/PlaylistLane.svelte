<script lang="ts">
  import { MILLISECONDS_PER_SECOND } from "../../player";
  import { getTranslator } from "../i18n/context";
  import AddSongsButton from "./AddSongsButton.svelte";
  import type { PlaylistView } from "./playlist-view";
  import { songColour } from "./song-colour";
  import { percentOf } from "./waveform-scale";

  /**
   * The playlist and the slideshow on one time scale: each song a block from where it starts (a
   * repeated one marked "↻", ADR-0047), the crossfades hatched including at a repeat's loop
   * boundary, the slideshow's end marked where it comes before the playlist's; under it, the
   * pictures' changes and, while the pictures outlast the playlist and it does not repeat, the time
   * they would play on in silence, with a card offering to fix it (ADR-0023, ADR-0047).
   */
  let {
    playlist,
    onRepeatMusic,
    onAddSongs,
  }: {
    playlist: PlaylistView;
    /** `undefined`: the playlist plays once. */
    onRepeatMusic: (repeatMusic: true | undefined) => void;
    onAddSongs: (files: readonly File[]) => void;
  } = $props();

  const { t, formatDuration, formatTenthSeconds } = getTranslator();
  const HALF = 2;

  const spanMs = $derived(Math.max(playlist.slideshowMs, playlist.playlistMs));
  const pct = (ms: number) => percentOf(ms, spanMs);
  const seconds = (ms: number) => ms / MILLISECONDS_PER_SECOND;
  const duration = (ms: number) => formatDuration(seconds(ms));
  const endsEarly = $derived(playlist.slideshowMs < playlist.playlistMs);
  /** The pictures outlast the playlist and it does not repeat (ADR-0047): by how much. */
  const short = $derived(playlist.overMs !== undefined);
  const fitted = $derived(playlist.fittedShareMs !== undefined);
  /** How long a song starting at `atMs` overlaps the one before; its number follows the overlap. */
  const overlapIntoMs = (atMs: number) =>
    playlist.crossfades.find((crossfade) => crossfade.atMs === atMs)?.ms ?? 0;
</script>

<div class="playlist-timeline">
  <div class="lane-label">
    <span>
      {t("music.playlistLane", {
        count: playlist.songs.length,
        duration: duration(playlist.playlistMs),
      })}
    </span>
    {#if playlist.repeatMusic}
      <span>{t("music.playlistRepeats")}</span>
    {:else if playlist.songs.length > 1}
      <span>{playlist.crossfade ? t("music.crossfadesHatched") : t("music.sequence")}</span>
    {/if}
  </div>
  <div class="playlist-lane" aria-hidden="true">
    {#each playlist.songs as song (song.atMs)}
      <span
        class="block mono"
        class:unreached={!song.reached}
        style:left={pct(song.atMs)}
        style:width={pct(song.excerptMs)}
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
    <span>
      {#if endsEarly}
        {t("music.laneFadesOut")}
      {:else if playlist.repeatMusic}
        {t("music.laneRepeats")}
      {:else if !short}
        {t("music.laneEndsWith")}
      {/if}
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
  {#if fitted}
    <p class="fit-note mint">
      {t("music.laneFitted", { seconds: formatTenthSeconds(seconds(playlist.fittedShareMs ?? 0)) })}
    </p>
  {:else if short}
    <div class="fit-note lemon">
      <p>{t("music.laneOutlasts", { time: duration(playlist.overMs ?? 0) })}</p>
      <div class="actions">
        <button type="button" class="btn small primary" onclick={() => onRepeatMusic(true)}>
          {t("music.repeatMusic")}
        </button>
        <AddSongsButton label={t("music.addSong")} onAdd={onAddSongs} />
      </div>
    </div>
  {/if}
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
  .fit-note {
    display: grid;
    gap: 8px;
    padding: 10px 12px;
    border-radius: var(--gl-radius);
    font-size: var(--gl-size-meta);
  }
  .fit-note.mint {
    background: color-mix(in srgb, var(--gl-mint) 22%, var(--gl-surface));
  }
  .fit-note.lemon {
    background: color-mix(in srgb, var(--gl-lemon) 22%, var(--gl-surface));
  }
  .fit-note p {
    margin: 0;
  }
  .fit-note .actions {
    display: flex;
    gap: 8px;
  }
</style>
