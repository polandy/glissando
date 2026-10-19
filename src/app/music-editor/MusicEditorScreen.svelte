<script lang="ts">
  import { MUSIC_FILE_PICKER_ACCEPT } from "../../import/music-format";
  import type { BetweenSongs, MusicTrim, PictureChanges } from "../../library/own-music";
  import type { PictureLength } from "../../library/picture-length";
  import { setMusicTrim } from "../../library/slideshow-edits-music";
  import type { StoredSlideshow } from "../../library/stored-slideshow";
  import Header from "../components/Header.svelte";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import type { ListenKind, ListenState } from "./listen-preview";
  import MusicEditorPanel from "./MusicEditorPanel.svelte";
  import {
    musicEditorView,
    type SongsBeatsStatus,
    type SongsLoudnessStatus,
  } from "./music-editor-view";
  import PlaylistLane from "./PlaylistLane.svelte";
  import { playlistView } from "./playlist-view";
  import SelectedSong from "./SelectedSong.svelte";
  import type { PendingSong } from "./song-intake";
  import SongList from "./SongList.svelte";

  /**
   * The music editor: the playlist's songs and how they meet the slideshow; the selected song's
   * excerpt on its waveform, its fades and how the pictures meet it, on its beats or evenly. Every
   * change goes to its callback and is stored at once. Without songs, it offers to add one.
   */
  let {
    slideshow,
    selectedSongId,
    beats,
    loudness,
    peaks,
    listening,
    pending,
    onBack,
    onSelectSong,
    onAddSongs,
    onRemoveSong,
    onMoveSong,
    onDismissPending,
    onBetweenSongs,
    onTrim,
    onFadeIn,
    onFadeOut,
    onVolume,
    onVolumeReset,
    onPictureChanges,
    onPictureLength,
    onSecondsPerPicture,
    onListen,
    onStopListening,
    saving,
  }: {
    slideshow: StoredSlideshow;
    /** The song edited; the first while none is chosen or the chosen one is gone. */
    selectedSongId: string | null;
    /** What is known of the songs' beats, updated as the background pass listens. */
    beats: SongsBeatsStatus;
    /** What is known of the songs' loudness, updated as the background pass listens (ADR-0040). */
    loudness: SongsLoudnessStatus;
    /** Fine peaks of the selected song's whole track, 0..1; null while it is decoded. */
    peaks: Float32Array | null;
    listening: ListenState | null;
    /** Picked files on their way into the playlist, or found unusable. */
    pending: readonly PendingSong[];
    onBack: () => void;
    onSelectSong: (songId: string) => void;
    onAddSongs: (files: readonly File[]) => void;
    onRemoveSong: (songId: string) => void;
    onMoveSong: (songId: string, toIndex: number) => void;
    onDismissPending: (key: number) => void;
    /** `undefined`: the songs crossfade. */
    onBetweenSongs: (between: BetweenSongs | undefined) => void;
    /** `undefined`: the whole track. */
    onTrim: (trim: MusicTrim | undefined) => void;
    /** `undefined`: automatic. */
    onFadeIn: (fadeMs: number | undefined) => void;
    onFadeOut: (fadeMs: number | undefined) => void;
    /** `undefined`: levelled. */
    onVolume: (volumeDb: number | undefined) => void;
    onVolumeReset: () => void;
    /** `undefined`: on the beat. */
    onPictureChanges: (changes: PictureChanges | undefined) => void;
    /** `undefined`: the pictures fill the music. */
    onPictureLength: (length: PictureLength | undefined) => void;
    onSecondsPerPicture: (seconds: number) => void;
    onListen: (kind: ListenKind) => void;
    onStopListening: () => void;
    /** An edit is being stored. */
    saving: boolean;
  } = $props();

  const { t } = getTranslator();

  let pickSongs = $state<HTMLInputElement>();
  /** The excerpt while a handle is dragged; stored on release. */
  let draft = $state.raw<MusicTrim | null>(null);
  const songId = $derived(
    slideshow.songs.find((song) => song.id === selectedSongId)?.id ?? slideshow.songs[0]?.id,
  );
  const edited = $derived(
    draft === null || songId === undefined ? slideshow : setMusicTrim(slideshow, songId, draft),
  );
  const music = $derived(
    songId === undefined ? null : musicEditorView(edited, beats, songId, loudness),
  );
  const playlist = $derived(playlistView(edited, beats, loudness));

  function trimmed(trim: MusicTrim | undefined): void {
    draft = null;
    onTrim(trim);
  }

  function picked(event: Event & { currentTarget: HTMLInputElement }): void {
    onAddSongs([...(event.currentTarget.files ?? [])]);
    // Cleared so that picking the same file again still reports a change.
    event.currentTarget.value = "";
  }
</script>

<input
  bind:this={pickSongs}
  type="file"
  accept={MUSIC_FILE_PICKER_ACCEPT}
  multiple
  hidden
  onchange={picked}
/>

<div class="screen" aria-busy={saving}>
  <Header crumbs={[t("start.library"), slideshow.title, t("music.crumb")]} {onBack} />
  {#if music === null}
    <main class="edit empty-edit">
      <div class="main-column">
        <div class="empty">
          <span class="disc"><Icon name="music" /></span>
          <b>{t("music.noMusicYet")}</b>
          <p>{t("music.noMusicWhy")}</p>
          <button class="primary" type="button" onclick={() => pickSongs?.click()}>
            <Icon name="plus" />{t("music.addSong")}
          </button>
        </div>
        {#if pending.length > 0}
          <SongList
            songs={playlist.songs}
            selectedSongId=""
            {pending}
            onSelect={onSelectSong}
            onMove={onMoveSong}
            onRemove={onRemoveSong}
            onDismiss={onDismissPending}
          />
        {/if}
      </div>
    </main>
  {:else}
    <main class="edit">
      <div class="main-column">
        <SongList
          songs={playlist.songs}
          selectedSongId={music.songId}
          {pending}
          onSelect={onSelectSong}
          onMove={onMoveSong}
          onRemove={onRemoveSong}
          onDismiss={onDismissPending}
        />
        <button class="add" type="button" onclick={() => pickSongs?.click()}>
          <Icon name="plus" />{t("music.addSong")}
        </button>
        <PlaylistLane {playlist} />
        <SelectedSong
          {music}
          {peaks}
          {listening}
          onDraft={(trim) => (draft = trim)}
          onCommit={trimmed}
          {onStopListening}
          {onListen}
        />
      </div>
      <MusicEditorPanel
        {music}
        {playlist}
        onTrim={trimmed}
        {onFadeIn}
        {onFadeOut}
        {onVolume}
        {onVolumeReset}
        {onPictureChanges}
        {onPictureLength}
        {onSecondsPerPicture}
        {onBetweenSongs}
      />
    </main>
  {/if}
</div>

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
  /* A zero basis: the screen keeps the viewport's height and each column scrolls inside it. */
  .edit {
    flex: 1 1 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    min-height: 0;
  }
  .main-column {
    display: grid;
    align-content: start;
    gap: 16px;
    min-height: 0;
    padding: 22px;
    overflow: auto;
  }
  .empty {
    display: grid;
    justify-items: center;
    gap: 10px;
    padding: 28px;
    border: 1px dashed var(--gl-line);
    border-radius: var(--gl-radius-large);
    color: var(--gl-muted);
    text-align: center;
  }
  .empty b {
    color: var(--gl-ink);
    font-family: var(--gl-font-display);
    font-size: var(--gl-size-name);
  }
  .empty p {
    max-width: 44ch;
    margin: 0;
  }
  .disc {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--gl-accent) 30%, var(--gl-surface));
    color: var(--gl-ink);
  }
  .primary {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 18px;
    border: 0;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-accent);
    color: var(--gl-accent-ink);
    font: inherit;
    font-size: var(--gl-size-body);
    font-weight: var(--gl-weight-semibold);
    cursor: pointer;
  }
  .primary:hover {
    background: var(--gl-accent-hover);
  }
  .empty-edit {
    grid-template-columns: minmax(0, 720px);
    justify-content: center;
  }
  @container (max-width: 720px) {
    /* The phone layout scrolls as one: the waveform on top, the panel below. */
    .edit {
      flex: none;
      grid-template-columns: 1fr;
    }
    .main-column {
      padding: 16px;
      overflow: visible;
    }
  }
</style>
