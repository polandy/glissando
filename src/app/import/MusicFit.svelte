<script lang="ts">
  import { getTranslator } from "../i18n/context";
  import type { PlaylistSongView } from "../music-editor/playlist-view";
  import { songColour } from "../music-editor/song-colour";
  import type { ImportTiming } from "./import-view";

  /**
   * The pictures against the chosen songs, both to one scale: each picture's segment by the rule
   * the slideshow is composed with, the songs under them, dimmed where the slideshow does not
   * reach them, and how the two meet (ADR-0022, ADR-0023).
   */
  let {
    pictureIds,
    urls,
    segmentsMs,
    timing,
    music,
    songs,
  }: {
    pictureIds: readonly string[];
    /** Thumbnail URLs by picture id, as far as loaded. */
    urls: ReadonlyMap<string, string>;
    segmentsMs: readonly number[];
    timing: ImportTiming;
    /** `timing.music`, which the step only shows the fit for. */
    music: NonNullable<ImportTiming["music"]>;
    /** In play order. */
    songs: readonly PlaylistSongView[];
  } = $props();

  const { t, formatDuration } = getTranslator();
  const PERCENT = 100;

  const spanSeconds = $derived(Math.max(timing.totalSeconds, music.seconds));
  const percentOf = (seconds: number) => `${(seconds / spanSeconds) * PERCENT}%`;
  /** How long each song leads, until the next one starts: together the playlist's length. */
  const leadsMs = $derived(
    songs.map((song, index) => (songs[index + 1]?.atMs ?? song.atMs + song.excerptMs) - song.atMs),
  );
  const someNotReached = $derived(songs.some((song) => !song.reached));
</script>

<div class="fit" aria-hidden="true">
  <div class="segments" style:width={percentOf(timing.totalSeconds)}>
    {#each pictureIds as id, index (id)}
      {@const url = urls.get(id)}
      <i
        style:flex-grow={segmentsMs[index]}
        style:background-image={url === undefined ? undefined : `url("${url}")`}
      ></i>
    {/each}
  </div>
  <div class="songs" style:width={percentOf(music.seconds)}>
    {#each songs as song, index (song.id)}
      <i
        class="mono"
        class:unreached={!song.reached}
        style:flex-grow={leadsMs[index]}
        style:background={songColour(song.number)}>{song.number}</i
      >
    {/each}
  </div>
  <div class="fitline mono">
    <span>
      {t("import.fitPictures", {
        count: pictureIds.length,
        time: formatDuration(timing.totalSeconds),
      })}
    </span>
    <span>{t("import.fitMusic", { time: formatDuration(music.seconds) })}</span>
  </div>
</div>
<p class="note">
  {#if music.kind === "fades-out"}
    {t(someNotReached ? "import.fitFadesOutNotReached" : "import.fitFadesOut")}
  {:else if music.kind === "silent-after"}
    {t("import.fitSilentAfter")}
  {:else}
    {t("import.fitEndsWithMusic")}
  {/if}
</p>

<style>
  .fit {
    display: grid;
    gap: 6px;
  }
  .segments {
    display: flex;
    gap: 2px;
    height: 26px;
  }
  .segments i {
    flex-basis: 0;
    min-width: 0;
    border-radius: 3px;
    background-color: var(--gl-hover);
    background-position: center;
    background-size: cover;
  }
  /* The songs to the same scale, each as long as it leads; one never reached is dimmed. */
  .songs {
    display: flex;
    gap: 2px;
    height: 22px;
  }
  .songs i {
    display: grid;
    flex-basis: 0;
    place-items: center;
    min-width: 2px;
    overflow: hidden;
    border-radius: 3px;
    color: var(--gl-song-ink);
    font-size: var(--gl-size-small);
    font-style: normal;
    font-weight: var(--gl-weight-semibold);
  }
  .songs i.unreached {
    opacity: 0.35;
  }
  .fitline {
    display: flex;
    justify-content: space-between;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
  .note {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
</style>
