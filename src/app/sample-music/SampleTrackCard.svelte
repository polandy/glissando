<script lang="ts">
  import { MILLISECONDS_PER_SECOND } from "../../player";
  import type { SampleTrack } from "../../sample-music/sample-tracks";
  import { SAMPLE_TRACK_COVER_URLS } from "../../sample-music/sample-track-covers";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import type { MessageKey } from "../i18n/messages";
  import { SAMPLE_TRACK_MOOD_KEYS } from "./sample-music-view";

  const PERCENT = 100;
  const FULL_TURN_DEGREES = 360;

  /**
   * One card of the sample-music grid (SAMPLE_MUSIC.md, "The grid"): cover with play/pause and
   * add/added, a progress ring while it downloads, then its title, mood, length and status.
   */
  let {
    track,
    disabled,
    playing,
    paused,
    loading,
    previewProgress,
    added,
    downloadProgress,
    statusKey,
    onTogglePlay,
    onToggleAdd,
  }: {
    track: SampleTrack;
    disabled: boolean;
    playing: boolean;
    paused: boolean;
    loading: boolean;
    /** The preview's playback fraction (0 to 1) while playing or paused. */
    previewProgress: number;
    added: boolean;
    /** The download's fraction (0 to 1) while the track downloads; undefined otherwise. */
    downloadProgress: number | undefined;
    statusKey: MessageKey | undefined;
    onTogglePlay: () => void;
    onToggleAdd: () => void;
  } = $props();

  const { t, formatDuration } = getTranslator();
</script>

<li class="card" class:disabled>
  <div class="cover">
    <img src={SAMPLE_TRACK_COVER_URLS[track.id]} alt="" />
    {#if !disabled}
      <button
        class="play"
        type="button"
        disabled={loading}
        aria-label={playing
          ? t("sampleMusicPicker.pauseTrack", { title: track.title })
          : t("sampleMusicPicker.playTrack", { title: track.title })}
        onclick={onTogglePlay}
      >
        <Icon name={playing ? "pause" : "play"} />
      </button>
    {/if}
    {#if downloadProgress !== undefined}
      <span
        class="ring"
        aria-hidden="true"
        style:background="conic-gradient(var(--gl-accent) {downloadProgress * FULL_TURN_DEGREES}deg,
        var(--gl-photo-badge) 0deg)"
      >
        <span class="ring-value">{Math.round(downloadProgress * PERCENT)}</span>
      </span>
    {:else}
      <button
        class="plus"
        class:added
        type="button"
        aria-pressed={added}
        disabled={disabled && !added}
        aria-label={added
          ? t("sampleMusicPicker.removeTrack", { title: track.title })
          : t("sampleMusicPicker.addTrack", { title: track.title })}
        onclick={onToggleAdd}
      >
        <Icon name={added ? "check" : "plus"} />
      </button>
    {/if}
    {#if playing || paused}
      <span class="progress" aria-hidden="true">
        <span class="bar" style:width="{previewProgress * PERCENT}%"></span>
      </span>
    {/if}
  </div>
  <div class="info">
    <b class="title">
      {#if playing}
        <span class="bars" aria-hidden="true"><span></span><span></span><span></span></span>
      {/if}
      <span class="name">{track.title}</span>
    </b>
    <span class="mood">{t(SAMPLE_TRACK_MOOD_KEYS[track.id])}</span>
    <span class="length mono">{formatDuration(track.durationMs / MILLISECONDS_PER_SECOND)}</span>
    {#if statusKey !== undefined}<span class="status">{t(statusKey)}</span>{/if}
  </div>
</li>

<style>
  .card {
    display: grid;
    gap: 8px;
  }
  .card.disabled {
    opacity: 0.55;
  }
  .cover {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: var(--gl-radius);
    background: var(--gl-raised);
  }
  .cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .play,
  .plus {
    position: absolute;
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border: 0;
    border-radius: 50%;
    cursor: pointer;
  }
  .play {
    top: 6px;
    left: 6px;
    background: var(--gl-photo-play-bg);
    color: var(--gl-photo-play-ink);
    box-shadow: var(--gl-photo-play-shadow);
  }
  .play:disabled {
    cursor: wait;
  }
  .plus {
    top: 6px;
    right: 6px;
    background: var(--gl-photo-badge);
    color: var(--gl-on-photo);
  }
  .plus.added {
    background: var(--gl-accent);
    color: var(--gl-accent-ink);
  }
  .plus:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  .ring {
    position: absolute;
    top: 6px;
    right: 6px;
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
  }
  .ring-value {
    display: grid;
    place-items: center;
    width: calc(100% - 6px);
    height: calc(100% - 6px);
    border-radius: 50%;
    background: var(--gl-photo-badge);
    color: var(--gl-on-photo);
    font-size: var(--gl-size-small);
  }
  .progress {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    display: block;
    height: 4px;
    background: var(--gl-photo-badge);
  }
  .bar {
    display: block;
    height: 100%;
    background: var(--gl-accent);
  }
  .info {
    display: grid;
    gap: 2px;
  }
  .title {
    display: flex;
    align-items: center;
    gap: 5px;
    overflow: hidden;
    font-size: var(--gl-size-label);
    font-weight: var(--gl-weight-semibold);
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .mood,
  .status {
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
  .length {
    color: var(--gl-faint);
    font-size: var(--gl-size-small);
  }
  .bars {
    display: flex;
    flex: none;
    align-items: center;
    gap: 1.5px;
    height: 10px;
  }
  .bars span {
    width: 2.5px;
    height: 100%;
    background: var(--gl-accent);
    animation: bar-move 0.9s ease-in-out infinite;
  }
  .bars span:nth-child(2) {
    animation-delay: 0.2s;
  }
  .bars span:nth-child(3) {
    animation-delay: 0.4s;
  }
  @keyframes bar-move {
    0%,
    100% {
      transform: scaleY(0.3);
    }
    50% {
      transform: scaleY(1);
    }
  }
</style>
