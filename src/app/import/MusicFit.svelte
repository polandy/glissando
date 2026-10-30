<script lang="ts">
  import { getTranslator } from "../i18n/context";
  import Notice from "../components/Notice.svelte";
  import type { PlaylistSongView } from "../music-editor/playlist-view";
  import { songColour } from "../music-editor/song-colour";
  import type { ImportTiming } from "./music-fit";

  /**
   * The pictures against the chosen songs, both to one scale: each picture's segment by the rule
   * the slideshow is composed with, the songs under them, dimmed where the slideshow does not
   * reach them, and how the two meet (ADR-0022, ADR-0023, ADR-0047).
   */
  let {
    pictureIds,
    urls,
    segmentsMs,
    timing,
    music,
    songs,
    onRepeatMusic,
    onAddSong,
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
    /** `undefined`: the music plays once through (ADR-0047). */
    onRepeatMusic: (repeatMusic: true | undefined) => void;
    /** Opens the hidden file input to pick another song (ADR-0047). */
    onAddSong: () => void;
  } = $props();

  const { t, formatDuration, formatTenthSeconds } = getTranslator();
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
  <div class="fitline">
    <span>
      {t("import.fitPictures", {
        count: pictureIds.length,
        time: formatDuration(timing.totalSeconds),
      })}
    </span>
    <span>{t("import.fitMusic", { time: formatDuration(music.seconds) })}</span>
  </div>
</div>
{#if music.kind === "fitted"}
  <Notice tone="mint" live={false}>
    {t("import.fitFitted", { seconds: formatTenthSeconds(music.shareSeconds) })}
  </Notice>
{:else if music.kind === "silent-after"}
  <Notice tone="warn">
    {t("import.fitOutlasts", { time: formatDuration(timing.totalSeconds - music.seconds) })}
    {#snippet actions()}
      <button class="btn primary" type="button" onclick={() => onRepeatMusic(true)}>
        {t("import.repeatButton")}
      </button>
      <button class="add" type="button" onclick={onAddSong}>{t("import.addSongButton")}</button>
    {/snippet}
  </Notice>
{:else if music.kind === "repeats"}
  <p class="note">
    {t("import.fitRepeats")}
    <button class="linkbtn" type="button" onclick={() => onRepeatMusic(undefined)}>
      {t("import.playOnceButton")}
    </button>
  </p>
{:else}
  <p class="note">
    {#if music.kind === "fades-out"}
      {t(someNotReached ? "import.fitFadesOutNotReached" : "import.fitFadesOut")}
    {:else}
      {t("import.fitEndsWithMusic")}
    {/if}
  </p>
{/if}

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
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 6px;
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
  .add {
    padding: 10px;
    border: 1px dashed var(--gl-line);
    border-radius: var(--gl-radius);
    background: transparent;
    color: var(--gl-ink);
    font: inherit;
    font-size: var(--gl-size-label);
    font-weight: var(--gl-weight-medium);
    cursor: pointer;
  }
  .add:hover {
    background: var(--gl-hover);
  }
  .linkbtn {
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--gl-accent);
    font: inherit;
    font-size: var(--gl-size-meta);
    font-weight: var(--gl-weight-semibold);
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
  }
  .linkbtn:hover {
    color: var(--gl-accent-hover);
  }
</style>
