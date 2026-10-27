<script lang="ts">
  import type { Snippet } from "svelte";
  import { MILLISECONDS_PER_SECOND } from "../../player";
  import { getTranslator } from "../i18n/context";
  import type { PlaylistSongView } from "./playlist-view";
  import { songColour } from "./song-colour";
  import VolumeBadge from "./VolumeBadge.svelte";

  /** A song's row label: its number, name, sample badge, detail line, volume badge and tag. */
  let {
    song,
    detail,
  }: {
    song: PlaylistSongView;
    /** The line under a song's name; by default its length and excerpt. */
    detail?: Snippet<[PlaylistSongView]> | undefined;
  } = $props();

  const { t, formatDuration } = getTranslator();
  const duration = (ms: number) => formatDuration(ms / MILLISECONDS_PER_SECOND);
</script>

<span class="number mono" style:background={songColour(song.number)}>{song.number}</span>
<span class="name">
  <span class="title">
    <b>{song.fileName}</b>
    {#if song.sampleTrack !== undefined}
      <span class="badge">{t("music.sampleBadge")}</span>
    {/if}
  </span>
  {#if detail === undefined}
    <small>
      {song.trimmed
        ? t("music.trimmedTo", {
            duration: duration(song.durationMs),
            excerpt: duration(song.excerptMs),
          })
        : duration(song.durationMs)}
    </small>
  {:else}
    {@render detail(song)}
  {/if}
</span>
<VolumeBadge badge={song.volumeBadge} />
<span class="tag">
  {song.reached ? t("music.songFrom", { time: duration(song.atMs) }) : t("music.notReached")}
</span>

<style>
  .number {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    color: var(--gl-song-ink);
    font-size: var(--gl-size-small);
    font-weight: var(--gl-weight-semibold);
  }
  .name {
    display: grid;
    min-width: 0;
  }
  .title {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }
  .title b {
    overflow: hidden;
    font-size: var(--gl-size-body);
    font-weight: var(--gl-weight-semibold);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .badge {
    padding: 1px 6px;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-accent-tint);
    color: var(--gl-accent-ink);
    font-size: var(--gl-size-caption);
  }
  .name :global(small),
  .tag {
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
</style>
