<script lang="ts">
  import type { MusicTrim } from "../../library/own-music";
  import { setMusicTrim } from "../../library/slideshow-edits-music";
  import Header from "../components/Header.svelte";
  import Icon from "../components/Icon.svelte";
  import Switch from "../components/Switch.svelte";
  import PictureLengthSection from "../components/PictureLengthSection.svelte";
  import { getTranslator } from "../i18n/context";
  import AddSongSheet from "./AddSongSheet.svelte";
  import AddSongsButton from "./AddSongsButton.svelte";
  import MoodPictureTimesSection from "./MoodPictureTimesSection.svelte";
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
        />
        <AddSongsButton
          label={t("music.addSong")}
          onAdd={onAddSongs}
          {...samplePreview === undefined ? {} : { onOpenSheet: openSheet }}
        />
        <PlaylistLane {playlist} {onRepeatMusic} {onAddSongs} />
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
