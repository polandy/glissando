<script lang="ts">
  import { onDestroy } from "svelte";
  import { MILLISECONDS_PER_SECOND } from "../../player";
  import {
    SAMPLE_TRACKS,
    type SampleTrack,
    type SampleTrackId,
  } from "../../sample-music/sample-tracks";
  import { SAMPLE_TRACK_COVER_URLS } from "../../sample-music/sample-track-covers";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import type { Toaster } from "../toast/toaster";
  import type { SamplePreview, SamplePreviewState } from "./sample-preview";
  import {
    SAMPLE_TRACK_MOOD_KEYS,
    sampleCardDisabled,
    sampleCardStatusKey,
  } from "./sample-music-view";

  /**
   * The cover grid every "Add a song" picker shares (SAMPLE_MUSIC.md, layout A): each card plays
   * its own preview, shows its mood and length, and offers "Add"/"✓ Added". The caller decides
   * what "added" means for its own list and what toggling it does.
   */
  let {
    preview,
    isAdded,
    onToggle,
    toaster,
  }: {
    preview: SamplePreview;
    isAdded: (trackId: SampleTrackId) => boolean;
    onToggle: (track: SampleTrack) => void;
    toaster: Toaster;
  } = $props();

  const { t, formatDuration } = getTranslator();

  // svelte-ignore state_referenced_locally
  let previewState = $state.raw<SamplePreviewState>(preview.state);
  // svelte-ignore state_referenced_locally
  let online = $state(preview.network.isOnline());
  let onDevice = $state.raw<ReadonlySet<SampleTrackId>>(new Set());

  $effect(() => preview.subscribe((next) => (previewState = next)));
  $effect(() => preview.network.onChange((next) => (online = next)));
  $effect(() =>
    preview.onError(() =>
      toaster.show({ text: t("sampleMusicPicker.previewError"), tone: "error" }),
    ),
  );
  $effect(() => {
    let left = false;
    Promise.all(
      SAMPLE_TRACKS.map(
        async (track) => [track.id, await preview.hasTrackOnDevice(track.id)] as const,
      ),
    ).then((pairs) => {
      if (!left) onDevice = new Set(pairs.filter(([, has]) => has).map(([id]) => id));
    });
    return () => {
      left = true;
    };
  });
  // The tab closing or changing, like the picker closing, lets go of the preview (SAMPLE_MUSIC.md).
  onDestroy(() => preview.stop());

  /** `trackId`'s progress while it plays or is paused; 0 otherwise. */
  function trackProgress(current: SamplePreviewState, trackId: SampleTrackId): number {
    return (current.kind === "playing" || current.kind === "paused") && current.trackId === trackId
      ? current.progress
      : 0;
  }
</script>

<div class="picker">
  {#if !online}
    <p class="notice">{t("sampleMusicPicker.offlineNotice")}</p>
  {/if}
  <ul class="grid">
    {#each SAMPLE_TRACKS as track (track.id)}
      {@const trackOnDevice = onDevice.has(track.id)}
      {@const disabled = sampleCardDisabled(online, trackOnDevice)}
      {@const playing = previewState.kind === "playing" && previewState.trackId === track.id}
      {@const paused = previewState.kind === "paused" && previewState.trackId === track.id}
      {@const loading = previewState.kind === "loading" && previewState.trackId === track.id}
      {@const added = isAdded(track.id)}
      {@const statusKey = added ? undefined : sampleCardStatusKey(online, trackOnDevice)}
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
              onclick={() => void preview.toggle(track)}
            >
              <Icon name={playing ? "pause" : "play"} />
            </button>
          {/if}
          {#if playing || paused}
            <span class="progress" aria-hidden="true">
              <span class="bar" style:width="{trackProgress(previewState, track.id) * 100}%"></span>
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
          <span class="length mono"
            >{formatDuration(track.durationMs / MILLISECONDS_PER_SECOND)}</span
          >
          {#if statusKey !== undefined}<span class="status">{t(statusKey)}</span>{/if}
          <button
            class="add"
            class:added
            type="button"
            aria-pressed={added}
            disabled={disabled && !added}
            onclick={() => onToggle(track)}
          >
            {added ? t("sampleMusicPicker.added") : t("sampleMusicPicker.add")}
          </button>
        </div>
      </li>
    {/each}
  </ul>
  <p class="footer">{t("sampleMusicPicker.footer")}</p>
</div>

<style>
  .picker {
    container-type: inline-size;
    display: grid;
    gap: 14px;
  }
  .notice {
    margin: 0;
    padding: 10px 12px;
    border-radius: var(--gl-radius);
    background: var(--gl-hover);
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  /* The picker itself is the query container, so the 2-column layout also applies inside the
     narrower "Add a song" sheet, not only at a narrow viewport. */
  @container (max-width: 600px) {
    .grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
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
  .play {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    border: 0;
    background: color-mix(in srgb, black 25%, transparent);
    color: white;
    cursor: pointer;
  }
  .progress {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    display: block;
    height: 4px;
    background: color-mix(in srgb, black 35%, transparent);
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
  .add {
    justify-self: start;
    padding: 5px 14px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-pill);
    background: transparent;
    color: var(--gl-ink);
    font: inherit;
    font-size: var(--gl-size-small);
    font-weight: var(--gl-weight-medium);
    cursor: pointer;
  }
  .add:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  .add.added {
    border-color: var(--gl-accent);
    background: var(--gl-accent-tint);
    color: var(--gl-accent-ink);
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
  .footer {
    margin: 0;
    color: var(--gl-faint);
    font-size: var(--gl-size-small);
  }
</style>
