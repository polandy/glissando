<script lang="ts">
  import { onDestroy } from "svelte";
  import {
    SAMPLE_TRACKS,
    type SampleTrack,
    type SampleTrackId,
  } from "../../sample-music/sample-tracks";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import type { Toaster } from "../toast/toaster";
  import type { SamplePreview, SamplePreviewState } from "./sample-preview";
  import type { SampleSongRow } from "./sample-song-pick";
  import {
    SAMPLE_MUSIC_VISIBLE_COUNT,
    sampleCardDisabled,
    sampleCardDownloadProgress,
    sampleCardStatusKey,
  } from "./sample-music-view";
  import SampleTrackCard from "./SampleTrackCard.svelte";

  const visible = SAMPLE_TRACKS.slice(0, SAMPLE_MUSIC_VISIBLE_COUNT);
  const rest = SAMPLE_TRACKS.slice(SAMPLE_MUSIC_VISIBLE_COUNT);
  const restTrackIds = new Set(rest.map((track) => track.id));

  /**
   * The accordion block every "Add a song" picker shares (SAMPLE_MUSIC.md, "The block"): three
   * cards, then "Show all" unfolds the rest and the credit footer in place. The caller decides
   * what "added" means for its own list and what toggling it does.
   */
  let {
    preview,
    isAdded,
    onToggle,
    toaster,
    sampleRows = [],
    initiallyExpanded = false,
  }: {
    preview: SamplePreview;
    isAdded: (trackId: SampleTrackId) => boolean;
    onToggle: (track: SampleTrack) => void;
    toaster: Toaster;
    /** Still downloading or failed, for the ring (SAMPLE_MUSIC.md, "Downloaded once"). */
    sampleRows?: readonly SampleSongRow[];
    /** Unfolded on open in the music editor's sheet; folded in the import step (SAMPLE_MUSIC.md). */
    initiallyExpanded?: boolean;
  } = $props();

  const { t } = getTranslator();
  const moreId = $props.id();

  // svelte-ignore state_referenced_locally
  let expanded = $state(initiallyExpanded);
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
  // The picker closing, like the tab or block closing, lets go of the preview (SAMPLE_MUSIC.md).
  onDestroy(() => preview.stop());

  /** `trackId`'s progress while it plays or is paused; 0 otherwise. */
  function trackProgress(current: SamplePreviewState, trackId: SampleTrackId): number {
    return (current.kind === "playing" || current.kind === "paused") && current.trackId === trackId
      ? current.progress
      : 0;
  }

  function toggleExpanded(): void {
    // The playing preview stops when the block folds over its card (SAMPLE_MUSIC.md, "Listening").
    if (expanded && previewState.kind !== "idle" && restTrackIds.has(previewState.trackId)) {
      preview.stop();
    }
    expanded = !expanded;
  }
</script>

{#snippet card(track: SampleTrack)}
  {@const trackOnDevice = onDevice.has(track.id)}
  {@const disabled = sampleCardDisabled(online, trackOnDevice)}
  {@const playing = previewState.kind === "playing" && previewState.trackId === track.id}
  {@const paused = previewState.kind === "paused" && previewState.trackId === track.id}
  {@const loading = previewState.kind === "loading" && previewState.trackId === track.id}
  {@const added = isAdded(track.id)}
  {@const statusKey = added ? undefined : sampleCardStatusKey(online, trackOnDevice)}
  <SampleTrackCard
    {track}
    {disabled}
    {playing}
    {paused}
    {loading}
    previewProgress={trackProgress(previewState, track.id)}
    {added}
    downloadProgress={sampleCardDownloadProgress(sampleRows, track.id)}
    {statusKey}
    onTogglePlay={() => void preview.toggle(track)}
    onToggleAdd={() => onToggle(track)}
  />
{/snippet}

<div class="block">
  <div class="header">
    <h2 class="block-title">{t("sampleMusicPicker.blockTitle")}</h2>
    <p class="block-subtitle">
      {t("sampleMusicPicker.blockSubtitle", { count: SAMPLE_TRACKS.length })}
    </p>
  </div>
  {#if !online}
    <p class="notice">{t("sampleMusicPicker.offlineNotice")}</p>
  {/if}
  <ul class="grid">
    {#each visible as track (track.id)}
      {@render card(track)}
    {/each}
  </ul>
  <div class="more" id={moreId} class:open={expanded}>
    <div class="more-inner">
      <ul class="grid">
        {#each rest as track (track.id)}
          {@render card(track)}
        {/each}
      </ul>
      <p class="footer">{t("sampleMusicPicker.footer")}</p>
    </div>
  </div>
  <button
    class="toggle"
    type="button"
    aria-expanded={expanded}
    aria-controls={moreId}
    onclick={toggleExpanded}
  >
    {expanded
      ? t("sampleMusicPicker.showFewer")
      : t("sampleMusicPicker.showAll", { count: SAMPLE_TRACKS.length })}
    <span class="chevron" class:open={expanded}><Icon name="chevronDown" /></span>
  </button>
</div>

<style>
  .block {
    container-type: inline-size;
    display: grid;
    gap: 14px;
    padding: 14px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
  }
  .header {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }
  .block-title {
    margin: 0;
    font-family: var(--gl-font-display);
    font-size: var(--gl-size-label);
    font-weight: var(--gl-weight-semibold);
  }
  .block-subtitle {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
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
  .toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    padding: 9px 14px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
    background: var(--gl-surface);
    color: var(--gl-ink);
    font: inherit;
    font-size: var(--gl-size-small);
    font-weight: var(--gl-weight-semibold);
    cursor: pointer;
  }
  .toggle:hover {
    background: var(--gl-hover);
  }
  .chevron {
    display: grid;
    place-items: center;
    transition: transform 0.2s ease;
  }
  .chevron.open {
    transform: rotate(180deg);
  }
  @media (prefers-reduced-motion: reduce) {
    .chevron {
      transition: none;
    }
  }
  .more {
    display: grid;
    grid-template-rows: 0fr;
    overflow: hidden;
    transition: grid-template-rows 0.25s ease;
  }
  .more.open {
    grid-template-rows: 1fr;
  }
  @media (prefers-reduced-motion: reduce) {
    .more {
      transition: none;
    }
  }
  .more-inner {
    display: grid;
    gap: 14px;
    min-height: 0;
  }
  .footer {
    margin: 0;
    color: var(--gl-faint);
    font-size: var(--gl-size-small);
  }
</style>
