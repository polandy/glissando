<script lang="ts">
  import { MUSIC_FILE_PICKER_ACCEPT } from "../../import/music-format";
  import type { SampleTrack, SampleTrackId } from "../../sample-music/sample-tracks";
  import Dialog from "../components/Dialog.svelte";
  import { getTranslator } from "../i18n/context";
  import OwnMusicRow from "../import/OwnMusicRow.svelte";
  import SampleMusicGrid from "../sample-music/SampleMusicGrid.svelte";
  import type { SamplePreview } from "../sample-music/sample-preview";
  import type { SampleSongRow } from "../sample-music/sample-song-pick";
  import type { Toaster } from "../toast/toaster";
  import type { PlaylistSongView } from "./playlist-view";

  /**
   * "Add a song" (app/MUSIC_EDITOR.md): the sample-music block, unfolded, above "Your own music".
   * A sample track already in the playlist is told apart from one still downloading or failed,
   * so toggling it off takes the right row away either way.
   */
  let {
    songs,
    samplePreview,
    sampleRows,
    toaster,
    isSampleTrackAdded,
    onAddSampleTrack,
    onRemoveSampleRow,
    onRemoveSong,
    onAdd,
    onError,
    onClose,
  }: {
    songs: readonly PlaylistSongView[];
    samplePreview: SamplePreview;
    sampleRows: readonly SampleSongRow[];
    toaster: Toaster;
    /** Downloading or failed; not yet in `songs` (song-intake.ts). */
    isSampleTrackAdded: (trackId: SampleTrackId) => boolean;
    onAddSampleTrack: (track: SampleTrack) => void;
    onRemoveSampleRow: (trackId: SampleTrackId) => void;
    onRemoveSong: (songId: string) => void;
    onAdd: (files: readonly File[]) => void;
    onError: (error: unknown) => void;
    onClose: () => void;
  } = $props();

  const { t } = getTranslator();

  let input: HTMLInputElement;

  function songIdFor(trackId: SampleTrackId): string | undefined {
    return songs.find((song) => song.sampleTrack === trackId)?.id;
  }

  function isAdded(trackId: SampleTrackId): boolean {
    return isSampleTrackAdded(trackId) || songIdFor(trackId) !== undefined;
  }

  function onToggle(track: SampleTrack): void {
    const songId = songIdFor(track.id);
    if (songId !== undefined) onRemoveSong(songId);
    else if (isSampleTrackAdded(track.id)) onRemoveSampleRow(track.id);
    else onAddSampleTrack(track);
  }

  function picked(event: Event & { currentTarget: HTMLInputElement }): void {
    onAdd([...(event.currentTarget.files ?? [])]);
    // Cleared so that picking the same file again still reports a change.
    event.currentTarget.value = "";
  }
</script>

<input
  bind:this={input}
  type="file"
  accept={MUSIC_FILE_PICKER_ACCEPT}
  multiple
  hidden
  onchange={picked}
/>

<Dialog
  title={t("music.addSong")}
  message={[]}
  onCancel={onClose}
  actions={[{ label: t("music.done"), tone: "primary", onSelect: onClose }]}
>
  <div class="panel">
    <SampleMusicGrid
      preview={samplePreview}
      {isAdded}
      {onToggle}
      {toaster}
      {sampleRows}
      initiallyExpanded={true}
    />
    <p class="or">{t("sampleMusicPicker.or")}</p>
    <OwnMusicRow onFiles={onAdd} {onError} onChoose={() => input.click()} />
  </div>
</Dialog>

<style>
  .panel {
    display: grid;
    gap: 14px;
    margin-top: 14px;
  }
  .or {
    margin: 0;
    color: var(--gl-faint);
    font-size: var(--gl-size-small);
    text-align: center;
  }
</style>
