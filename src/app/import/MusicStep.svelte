<script lang="ts">
  import { onDestroy } from "svelte";
  import { DEFAULT_SECONDS_PER_PICTURE } from "../../library/stored-slideshow";
  import { MUSIC_FILE_PICKER_ACCEPT } from "../../import/music-format";
  import { MILLISECONDS_PER_SECOND } from "../../player";
  import type { SampleTrack, SampleTrackId } from "../../sample-music/sample-tracks";
  import { getTranslator } from "../i18n/context";
  import Icon from "../components/Icon.svelte";
  import { browserObjectUrls, ObjectUrls } from "../media/object-urls";
  import type { PlaylistSongView } from "../music-editor/playlist-view";
  import SongList from "../music-editor/SongList.svelte";
  import SampleMusicGrid from "../sample-music/SampleMusicGrid.svelte";
  import type { SamplePreview } from "../sample-music/sample-preview";
  import type { Toaster } from "../toast/toaster";
  import ImportFrame from "./ImportFrame.svelte";
  import OwnMusicRow from "./OwnMusicRow.svelte";
  import { chosenSongs, type ImportSession, type ImportSong } from "./import-session";
  import {
    convertibleSourceLabel,
    importPlaylist,
    importSlideDurationsMs,
    ownDurationsMs,
    importTiming,
    musicFormatLabel,
  } from "./import-view";
  import type { PendingSong } from "./music-pick";
  import MusicTimingPanel from "./MusicTimingPanel.svelte";

  let {
    session,
    loadThumbnail,
    onBack,
    onCreate,
    onError,
    samplePreview,
    toaster,
  }: {
    session: ImportSession;
    loadThumbnail: (pictureId: string) => Promise<Blob>;
    onBack: () => void;
    onCreate: () => void;
    onError: (error: unknown) => void;
    /** `undefined` when the build turns sample music off (SAMPLE_MUSIC.md). */
    samplePreview?: SamplePreview | undefined;
    toaster: Toaster;
  } = $props();

  const { t, formatDuration, formatSeconds } = getTranslator();

  // The session and the loader are fixed for the step's lifetime.
  // svelte-ignore state_referenced_locally
  let choices = $state.raw(session.choices.current());
  // svelte-ignore state_referenced_locally
  let pictureIds = $state.raw(session.pictures.state.pictures.map((picture) => picture.id));
  // svelte-ignore state_referenced_locally
  let ownMs = $state.raw(ownDurationsMs(session.pictures.state.pictures));
  let urls = $state<ReadonlyMap<string, string>>(new Map());
  let pickMusic: HTMLInputElement;

  // svelte-ignore state_referenced_locally
  const thumbnails = new ObjectUrls({ ...browserObjectUrls, load: loadThumbnail, onError });
  onDestroy(() => thumbnails.dispose());

  $effect(() => session.choices.subscribe((next) => (choices = next)));
  $effect(() =>
    session.pictures.subscribe((next) => {
      pictureIds = next.pictures.map((picture) => picture.id);
      ownMs = ownDurationsMs(next.pictures);
    }),
  );
  $effect(() => thumbnails.subscribe((next) => (urls = next)));
  const chosen = $derived(chosenSongs(choices));
  const pending = $derived(
    choices.songs.filter(
      (song): song is PendingSong =>
        song.kind === "reading" || song.kind === "converting" || song.kind === "unusable",
    ),
  );
  const sampleRows = $derived(
    choices.songs.filter(
      (song): song is Extract<ImportSong, { kind: "downloadingSample" | "failedSampleDownload" }> =>
        song.kind === "downloadingSample" || song.kind === "failedSampleDownload",
    ),
  );
  function chosenSampleSong(trackId: SampleTrackId): (typeof chosen)[number] | undefined {
    return chosen.find((song) => song.sample?.trackId === trackId);
  }

  /** Already chosen, or still downloading, as the "✓ Added" state the card shows either way. */
  function sampleTrackAdded(trackId: SampleTrackId): boolean {
    return chosenSampleSong(trackId) !== undefined || session.isSampleTrackAdded(trackId);
  }

  function toggleSample(track: SampleTrack): void {
    const chosenSong = chosenSampleSong(track.id);
    if (chosenSong !== undefined) {
      session.removeSong(chosenSong.key);
    } else if (session.isSampleTrackAdded(track.id)) {
      session.removeSampleTrack(track.id);
    } else {
      session.addSampleTrack(track).catch(onError);
    }
  }

  const reading = $derived(
    pending.some((song) => song.kind === "reading" || song.kind === "converting"),
  );
  $effect(() => thumbnails.sync(chosen.length > 0 ? pictureIds : []));

  const pictureCount = $derived(pictureIds.length);
  const ownSeconds = $derived(choices.pictureLength !== undefined);
  const musicMs = $derived(importPlaylist(chosen, 0).playlistMs);
  const music = $derived(
    chosen.length === 0 ? undefined : { durationMs: musicMs, filled: !ownSeconds },
  );
  const timing = $derived(importTiming(ownMs, music, choices.secondsPerPicture));
  // Each picture's segment, by the rule the slideshow is composed with.
  const segmentsMs = $derived(importSlideDurationsMs(ownMs, music, choices.secondsPerPicture));
  const playlist = $derived(importPlaylist(chosen, timing.totalSeconds * MILLISECONDS_PER_SECOND));

  function add(files: readonly File[]): void {
    if (files.length > 0) session.addSongs(files).catch(onError);
  }

  function picked(event: Event & { currentTarget: HTMLInputElement }): void {
    add([...(event.currentTarget.files ?? [])]);
    // Cleared so that picking the same file again still reports a change.
    event.currentTarget.value = "";
  }

  /** A song's view carries its key as its id. */
  const keyOf = (song: PlaylistSongView): number => Number(song.id);
</script>

<input
  bind:this={pickMusic}
  type="file"
  accept={MUSIC_FILE_PICKER_ACCEPT}
  multiple
  hidden
  onchange={picked}
/>

{#snippet songDetail(song: PlaylistSongView)}
  {@const picked = chosen.find((candidate) => candidate.key === keyOf(song))}
  {#if picked !== undefined}
    <small class="mono">
      {t("import.trackMeta", {
        duration: formatDuration(picked.durationMs / MILLISECONDS_PER_SECOND),
        format: musicFormatLabel(picked.file.name, picked.file.type),
      })}
    </small>
    {#if picked.convertedFrom !== null}
      <small>
        {t("import.convertedFrom", { format: convertibleSourceLabel(picked.convertedFrom) })}
      </small>
    {/if}
  {/if}
{/snippet}

<ImportFrame step="music" {onBack}>
  <div>
    <h1 class="title">{t("import.musicTitle")}</h1>
    <p class="lead">
      {t("import.musicText", { seconds: formatSeconds(DEFAULT_SECONDS_PER_PICTURE) })}
    </p>
  </div>

  {#if samplePreview !== undefined}
    <SampleMusicGrid
      preview={samplePreview}
      isAdded={sampleTrackAdded}
      onToggle={toggleSample}
      {sampleRows}
      {toaster}
    />
    <p class="or">{t("sampleMusicPicker.or")}</p>
  {/if}
  <OwnMusicRow onFiles={add} {onError} onChoose={() => pickMusic.click()} />

  <div class="soundtrack">
    <h2 class="soundtrack-title">{t("import.soundtrackTitle")}</h2>
    {#if choices.songs.length > 0}
      <SongList
        songs={playlist.songs}
        {pending}
        {sampleRows}
        detail={songDetail}
        onMove={(songId, toIndex) => session.moveSong(Number(songId), toIndex)}
        onRemove={(songId) => session.removeSong(Number(songId))}
        onDismiss={(key) => session.removeSong(key)}
        onRemoveSampleRow={(trackId) => session.removeSampleTrack(trackId)}
      />
    {:else}
      <p class="soundtrack-empty">{t("import.soundtrackEmpty")}</p>
    {/if}
  </div>

  <MusicTimingPanel
    {ownSeconds}
    secondsPerPicture={choices.secondsPerPicture}
    onPictureLength={(length) => session.setPictureLength(length)}
    onSecondsPerPicture={(seconds) => session.setSecondsPerPicture(seconds)}
    {pictureIds}
    {urls}
    {segmentsMs}
    {timing}
    songs={playlist.songs}
    {pictureCount}
  />

  {#snippet actions()}
    <button class="btn" type="button" onclick={onBack}>
      <Icon name="back" />{t("import.backToPictures")}
    </button>
    {#if reading}
      <button class="btn primary" type="button" disabled>{t("import.convertingButton")}</button>
    {:else}
      <button class="btn primary" type="button" onclick={onCreate}>
        {chosen.length > 0 ? t("import.create") : t("import.createWithoutMusic")}
      </button>
    {/if}
  {/snippet}
</ImportFrame>

<style>
  .or {
    margin: 0;
    color: var(--gl-faint);
    font-size: var(--gl-size-small);
    text-align: center;
  }
  .soundtrack {
    display: grid;
    gap: 8px;
  }
  .soundtrack-title {
    margin: 0;
    font-family: var(--gl-font-display);
    font-size: var(--gl-size-label);
    font-weight: var(--gl-weight-semibold);
  }
  .soundtrack-empty {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
</style>
