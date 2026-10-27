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

<li class="card" class:disabled class:added>
  <img class="cover" src={SAMPLE_TRACK_COVER_URLS[track.id]} alt="" />
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
      <span class="dot" aria-hidden="true">
        <Icon name={added ? "check" : "plus"} />
      </span>
    </button>
  {/if}
  <div class="shade">
    <b class="title">
      {#if playing}
        <span class="bars" aria-hidden="true"><span></span><span></span><span></span></span>
      {/if}
      <span class="name">{track.title}</span>
    </b>
    <p class="mood">{t(SAMPLE_TRACK_MOOD_KEYS[track.id])}</p>
    <p class="length mono">{formatDuration(track.durationMs / MILLISECONDS_PER_SECOND)}</p>
    {#if statusKey !== undefined}<span class="status">{t(statusKey)}</span>{/if}
  </div>
  {#if playing || paused}
    <span class="progress" aria-hidden="true">
      <span class="bar" style:width="{previewProgress * PERCENT}%"></span>
    </span>
  {/if}
</li>

<style>
  .card {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: var(--gl-radius);
    background: var(--gl-raised);
  }
  .card.disabled {
    opacity: 0.55;
  }
  .cover {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  /* Above the shade: on a phone a wrapping title grows the shade over the card's top corners. */
  .play,
  .plus,
  .ring {
    z-index: 1;
  }
  .play {
    position: absolute;
    top: 6px;
    left: 6px;
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: 50%;
    background: var(--gl-photo-play-bg);
    color: var(--gl-photo-play-ink);
    box-shadow: var(--gl-photo-play-shadow);
    cursor: pointer;
  }
  .play:disabled {
    cursor: wait;
  }
  .plus {
    position: absolute;
    top: 0;
    right: 0;
    display: grid;
    width: 44px;
    height: 44px;
    place-items: center;
    border: 0;
    background: transparent;
    padding: 0;
    cursor: pointer;
  }
  .plus:disabled {
    cursor: not-allowed;
  }
  .dot {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: var(--gl-photo-badge);
    color: var(--gl-on-photo);
  }
  .plus.added .dot {
    background: var(--gl-accent);
    color: var(--gl-accent-ink);
  }
  .plus:disabled .dot {
    opacity: 0.6;
  }
  .ring {
    position: absolute;
    top: 5px;
    right: 5px;
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
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
  .shade {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    padding: 22px 8px 6px;
    background: linear-gradient(transparent, var(--gl-photo-fade));
    color: var(--gl-on-photo);
    pointer-events: none;
  }
  .title {
    display: -webkit-box;
    margin: 0;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    font-size: var(--gl-size-small);
    font-weight: var(--gl-weight-semibold);
  }
  .mood {
    margin: 2px 0 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: var(--gl-size-small);
    opacity: 0.8;
  }
  .length {
    margin: 1px 0 0;
    font-size: var(--gl-size-small);
    opacity: 0.8;
  }
  .status {
    display: block;
    margin-top: 2px;
    font-size: var(--gl-size-small);
    opacity: 0.8;
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
  .bars {
    display: inline-flex;
    align-items: center;
    gap: 1.5px;
    height: 10px;
    margin-right: 4px;
    vertical-align: middle;
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
