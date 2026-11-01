<script lang="ts">
  import "./music-editor-touch.css";
  import type { MusicTrim } from "../../library/own-music";
  import { setMusicTrim } from "../../library/slideshow-edits-music";
  import Header from "../components/Header.svelte";
  import Switch from "../components/Switch.svelte";
  import PictureLengthSection from "../components/PictureLengthSection.svelte";
  import "./music-editor-touch.css";
  import { getTranslator } from "../i18n/context";
  import AddSongSheet from "./AddSongSheet.svelte";
  import AddSongsButton from "./AddSongsButton.svelte";
  import MoodPictureTimesSection from "./MoodPictureTimesSection.svelte";
  import NoMusicCard from "./NoMusicCard.svelte";
  import MusicEditorPanel from "./MusicEditorPanel.svelte";
  import { musicEditorView } from "./music-editor-view";
  import type { MusicEditorScreenProps } from "./music-editor-screen-props";
  import PlaylistLane from "./PlaylistLane.svelte";
  import { playlistView } from "./playlist-view";
  import SelectedSong from "./SelectedSong.svelte";
  import SongList from "./SongList.svelte";

  /**
   * The music editor: the playlist's songs and how they meet the slideshow; the selected song's
   * excerpt on its waveform, its fades and how the pictures meet it, on its beats or evenly. Every
   * change goes to its callback and is stored at once. Without songs, it offers to add one and
   * still sets the picture length, the only place a slideshow without music does so.
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
    detailsStore,
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
    onRepeatMusic,
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
  /** The "Details" switch: the volume line, beat ticks, the slideshow lane and crossfade hatching. */
  // The store is fixed for the screen's lifetime.
  // svelte-ignore state_referenced_locally
  let details = $state(detailsStore.read() === "shown");
  function setDetails(shown: boolean): void {
    details = shown;
    detailsStore.write(shown ? "shown" : "hidden");
  }
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
  const playlist = $derived(playlistView(edited, beats, loudness, details));
  /** `SongList` edits the stored songs, each once; the playlist's repeats (ADR-0047) are `PlaylistLane`'s alone. */
  const ownedSongs = $derived(playlist.songs.filter((song) => song.repeated !== true));

  function trimmed(trim: MusicTrim | undefined): void {
    draft = null;
    onTrim(trim);
  }
</script>

<div class="screen" aria-busy={saving}>
  <Header crumbs={[t("start.library"), slideshow.title, t("music.crumb")]} {onBack}>
    {#snippet actions()}
      {#if music !== null}
        <span class="details-switch">
          <Switch checked={details} label={t("music.details")} showLabel onChange={setDetails} />
        </span>
      {/if}
    {/snippet}
  </Header>
  {#if music === null}
    <main class="edit empty-edit">
      <div class="main-column">
        <NoMusicCard
          onAdd={onAddSongs}
          {...samplePreview === undefined ? {} : { onOpenSheet: openSheet }}
        />
        {#if pending.length > 0 || sampleRows.length > 0}
          <SongList
            songs={ownedSongs}
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
        {#if slideshow.mood === undefined}
          <PictureLengthSection
            withoutMusic
            ownSeconds
            secondsPerPicture={slideshow.secondsPerPicture}
            {onPictureLength}
            {onSecondsPerPicture}
          />
        {:else}
          <MoodPictureTimesSection
            moodPictureLength={{ mood: slideshow.mood, beatsPerMinute: undefined }}
            {onSetOwnPictureTimes}
          />
        {/if}
      </div>
    </main>
  {:else}
    <main class="edit">
      <div class="main-column">
        <div class="songs-block">
          <SongList
            songs={ownedSongs}
            selectedSongId={music.songId}
            {pending}
            {sampleRows}
            onSelect={onSelectSong}
            onMove={onMoveSong}
            onRemove={onRemoveSong}
            onDismiss={onDismissPending}
            {onRemoveSampleRow}
          >
            {#snippet addRow()}
              <AddSongsButton
                label={t("music.addSong")}
                onAdd={onAddSongs}
                {...samplePreview === undefined ? {} : { onOpenSheet: openSheet }}
              />
            {/snippet}
          </SongList>
        </div>
        <div class="lane-block"><PlaylistLane {playlist} /></div>
        {#if details}
          <div class="wave-block">
            <SelectedSong
              {music}
              {peaks}
              {listening}
              {details}
              onDraft={(trim) => (draft = trim)}
              onCommit={trimmed}
              {onStopListening}
              {onListen}
            />
          </div>
        {/if}
      </div>
      <MusicEditorPanel
        {music}
        {playlist}
        {details}
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
        {onRepeatMusic}
      />
    </main>
  {/if}
</div>
{#if sheetOpen && samplePreview !== undefined}
  <AddSongSheet
    songs={ownedSongs}
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
  .details-switch {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--gl-muted);
    font-size: var(--gl-size-label);
  }
  .empty-edit {
    grid-template-columns: minmax(0, 720px);
    justify-content: center;
  }
  .main-column > :where(.lane-block, .wave-block) {
    display: grid;
    gap: 10px;
  }
  @container (max-width: 720px) {
    /*
     * The phone layout scrolls as one column of grid items, in this order: the songs, the
     * lane, the Slideshow group, the selected song's waveform, its settings. The two column
     * wrappers vanish so the panel's groups can sit between the main column's blocks.
     */
    .edit {
      flex: none;
      grid-template-columns: 1fr;
      align-content: start;
      gap: 16px;
      padding: 16px;
    }
    .main-column {
      display: contents;
    }
    .songs-block {
      order: 1;
    }
    .lane-block {
      order: 2;
    }
    .wave-block {
      order: 4;
    }
  }
</style>
