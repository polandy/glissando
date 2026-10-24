<script lang="ts">
  import type { MusicTrim } from "../../library/own-music";
  import { setMusicTrim } from "../../library/slideshow-edits-music";
  import Header from "../components/Header.svelte";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import AddSongSheet from "./AddSongSheet.svelte";
  import AddSongsButton from "./AddSongsButton.svelte";
  import MusicEditorPanel from "./MusicEditorPanel.svelte";
  import { musicEditorView } from "./music-editor-view";
  import type { MusicEditorScreenProps } from "./music-editor-screen-props";
  import PlaylistLane from "./PlaylistLane.svelte";
  import { playlistView } from "./playlist-view";
  import SelectedSong from "./SelectedSong.svelte";
  import SongList from "./SongList.svelte";
  import VolumeComparisonBox from "./VolumeComparisonBox.svelte";

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
    sampleRows,
    samplePreview,
    toaster,
    onBack,
    onError,
    onSelectSong,
    onAddSongs,
    onRemoveSong,
    onMoveSong,
    onDismissPending,
    onRemoveSampleRow,
    isSampleTrackAdded,
    onAddSampleTrack,
    onBetweenSongs,
    onTrim,
    onFadeIn,
    onFadeOut,
    onVolume,
    onVolumeReset,
    onListenVolume,
    onToggleOriginal,
    onPictureChanges,
    onPictureLength,
    onSecondsPerPicture,
    onSetOwnPictureTimes,
    onListen,
    onStopListening,
    saving,
  }: MusicEditorScreenProps = $props();

  const { t } = getTranslator();

  /** The excerpt while a handle is dragged; stored on release. */
  let draft = $state.raw<MusicTrim | null>(null);
  let sheetOpen = $state(false);
  function openSheet(): void {
    sheetOpen = true;
  }
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
</script>

<div class="screen" aria-busy={saving}>
  <Header crumbs={[t("start.library"), slideshow.title, t("music.crumb")]} {onBack} />
  {#if music === null}
    <main class="edit empty-edit">
      <div class="main-column">
        <div class="empty">
          <span class="disc"><Icon name="music" /></span>
          <b>{t("music.noMusicYet")}</b>
          <p>{t("music.noMusicWhy")}</p>
          <AddSongsButton
            primary
            label={t("music.addSong")}
            onAdd={onAddSongs}
            {...samplePreview === undefined ? {} : { onOpenSheet: openSheet }}
          />
        </div>
        {#if pending.length > 0 || sampleRows.length > 0}
          <SongList
            songs={playlist.songs}
            selectedSongId=""
            {pending}
            {sampleRows}
            onSelect={onSelectSong}
            onMove={onMoveSong}
            onRemove={onRemoveSong}
            onDismiss={onDismissPending}
            {onRemoveSampleRow}
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
          {sampleRows}
          onSelect={onSelectSong}
          onMove={onMoveSong}
          onRemove={onRemoveSong}
          onDismiss={onDismissPending}
          {onRemoveSampleRow}
        />
        <VolumeComparisonBox slideshow={edited} {loudness} />
        <AddSongsButton
          label={t("music.addSong")}
          onAdd={onAddSongs}
          {...samplePreview === undefined ? {} : { onOpenSheet: openSheet }}
        />
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
        {listening}
        onTrim={trimmed}
        {onFadeIn}
        {onFadeOut}
        {onVolume}
        {onVolumeReset}
        {onListenVolume}
        {onToggleOriginal}
        {onPictureChanges}
        {onPictureLength}
        {onSecondsPerPicture}
        {onSetOwnPictureTimes}
        {onBetweenSongs}
      />
    </main>
  {/if}
</div>
{#if sheetOpen && samplePreview !== undefined}
  <AddSongSheet
    songs={playlist.songs}
    {samplePreview}
    {sampleRows}
    {toaster}
    {isSampleTrackAdded}
    {onAddSampleTrack}
    {onRemoveSampleRow}
    {onRemoveSong}
    onAdd={onAddSongs}
    {onError}
    onClose={() => (sheetOpen = false)}
  />
{/if}

<style>
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
