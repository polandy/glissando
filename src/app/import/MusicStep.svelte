<script lang="ts">
  import { onDestroy } from "svelte";
  import { DEFAULT_SECONDS_PER_PICTURE } from "../../library/stored-slideshow";
  import { MUSIC_FILE_PICKER_ACCEPT } from "../../import/music-format";
  import { MILLISECONDS_PER_SECOND } from "../../player";
  import PictureLengthSection from "../components/PictureLengthSection.svelte";
  import SecondsStepper from "../components/SecondsStepper.svelte";
  import { getTranslator } from "../i18n/context";
  import Icon from "../components/Icon.svelte";
  import { browserObjectUrls, ObjectUrls } from "../media/object-urls";
  import type { PlaylistSongView } from "../music-editor/playlist-view";
  import SongList from "../music-editor/SongList.svelte";
  import DropZone from "./DropZone.svelte";
  import ImportFrame from "./ImportFrame.svelte";
  import { chosenSongs, type ImportSession } from "./import-session";
  import {
    convertibleSourceLabel,
    importPlaylist,
    importSlideDurationsMs,
    ownDurationsMs,
    importTiming,
    musicFormatLabel,
  } from "./import-view";
  import MusicFit from "./MusicFit.svelte";
  import type { PendingSong } from "./music-pick";

  let {
    session,
    loadThumbnail,
    onBack,
    onCreate,
    onError,
  }: {
    session: ImportSession;
    loadThumbnail: (pictureId: string) => Promise<Blob>;
    onBack: () => void;
    onCreate: () => void;
    onError: (error: unknown) => void;
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
    choices.songs.filter((song): song is PendingSong => song.kind !== "chosen"),
  );
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

  {#if choices.songs.length > 0}
    <SongList
      songs={playlist.songs}
      {pending}
      detail={songDetail}
      onMove={(songId, toIndex) => session.moveSong(Number(songId), toIndex)}
      onRemove={(songId) => session.removeSong(Number(songId))}
      onDismiss={(key) => session.removeSong(key)}
    />
    <button class="add" type="button" onclick={() => pickMusic.click()}>
      <Icon name="plus" />{t("import.addAnotherSong")}
    </button>
  {:else}
    <DropZone icon="music" onFiles={add} {onError}>
      <button class="btn primary" type="button" onclick={() => pickMusic.click()}>
        {t("import.pickMusic")}
      </button>
      <span class="formats">{t("import.musicFormats")}</span>
    </DropZone>
  {/if}

  {#if timing.music !== null}
    <div class="panel">
      <PictureLengthSection
        {ownSeconds}
        secondsPerPicture={choices.secondsPerPicture}
        onPictureLength={(length) => session.setPictureLength(length)}
        onSecondsPerPicture={(seconds) => session.setSecondsPerPicture(seconds)}
      />
      <MusicFit
        {pictureIds}
        {urls}
        {segmentsMs}
        {timing}
        music={timing.music}
        songs={playlist.songs}
      />
    </div>
  {:else}
    <div class="panel track">
      <div class="text">
        <b>{t("import.secondsTitle")}</b>
        <span class="muted meta">
          {t("import.secondsHint", { seconds: formatSeconds(DEFAULT_SECONDS_PER_PICTURE) })}
        </span>
      </div>
      <SecondsStepper
        seconds={choices.secondsPerPicture}
        onChange={(seconds) => session.setSecondsPerPicture(seconds)}
      />
    </div>
  {/if}

  <dl class="timing">
    <div>
      <dt>{t("import.timingPictures")}</dt>
      <dd class="mono">{pictureCount}</dd>
    </div>
    <div>
      <dt>{t("import.timingPerPicture")}</dt>
      <dd class="mono">{formatSeconds(timing.perPictureSeconds)}</dd>
    </div>
    <div>
      <dt>{t("import.timingTotal")}</dt>
      <dd class="mono">{formatDuration(timing.totalSeconds)}</dd>
    </div>
  </dl>

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
  .add {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
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
  .formats {
    font-size: var(--gl-size-small);
    color: var(--gl-faint);
  }
  .panel {
    display: grid;
    gap: 14px;
    padding: 16px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
  }
  .track {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .text {
    flex: 1;
    min-width: 0;
  }
  .text b {
    display: block;
    font-weight: var(--gl-weight-semibold);
  }
  .meta {
    font-size: var(--gl-size-meta);
  }
  .timing {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    margin: 0;
    overflow: hidden;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
  }
  .timing div {
    display: flex;
    flex-direction: column-reverse;
    gap: 2px;
    padding: 10px 12px;
    background: var(--gl-raised);
  }
  .timing div + div {
    border-left: 1px solid var(--gl-line);
  }
  .timing dd {
    margin: 0;
    font-weight: var(--gl-weight-medium);
    font-size: var(--gl-size-name);
  }
  .timing dt {
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
</style>
