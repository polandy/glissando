<script lang="ts">
  import { MUSIC_FILE_PICKER_ACCEPT } from "../../import/music-format";
  import type { SampleTrack, SampleTrackId } from "../../sample-music/sample-tracks";
  import Dialog from "../components/Dialog.svelte";
  import Tabs from "../components/Tabs.svelte";
  import { getTranslator } from "../i18n/context";
  import SampleMusicGrid from "../sample-music/SampleMusicGrid.svelte";
  import type { SamplePreview } from "../sample-music/sample-preview";
  import type { Toaster } from "../toast/toaster";
  import type { PlaylistSongView } from "./playlist-view";

  /**
   * "Add a song" (app/MUSIC_EDITOR.md): "My music" holds the file picker, "Sample music" the
   * shared cover grid. A sample track already in the playlist is told apart from one still
   * downloading or failed, so toggling it off takes the right row away either way.
   */
  let {
    songs,
    samplePreview,
    toaster,
    isSampleTrackAdded,
    onAddSampleTrack,
    onRemoveSampleRow,
    onRemoveSong,
    onAdd,
    onClose,
  }: {
    songs: readonly PlaylistSongView[];
    samplePreview: SamplePreview;
    toaster: Toaster;
    /** Downloading or failed; not yet in `songs` (song-intake.ts). */
    isSampleTrackAdded: (trackId: SampleTrackId) => boolean;
    onAddSampleTrack: (track: SampleTrack) => void;
    onRemoveSampleRow: (trackId: SampleTrackId) => void;
    onRemoveSong: (songId: string) => void;
    onAdd: (files: readonly File[]) => void;
    onClose: () => void;
  } = $props();

  const { t } = getTranslator();

  let tab = $state<"myMusic" | "sampleMusic">("myMusic");
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
  <Tabs
    idPrefix="add-song"
    label={t("music.addSong")}
    tabs={[
      { value: "myMusic", label: t("sampleMusicPicker.tabMyMusic") },
      { value: "sampleMusic", label: t("sampleMusicPicker.tabSampleMusic") },
    ]}
    selected={tab}
    onSelect={(next) => (tab = next)}
  />
  <div
    id="add-song-panel-myMusic"
    class="panel"
    role="tabpanel"
    aria-labelledby="add-song-tab-myMusic"
    hidden={tab !== "myMusic"}
  >
    <button class="btn primary" type="button" onclick={() => input.click()}>
      {t("import.pickMusic")}
    </button>
  </div>
  {#if tab === "sampleMusic"}
    <div
      id="add-song-panel-sampleMusic"
      class="panel"
      role="tabpanel"
      aria-labelledby="add-song-tab-sampleMusic"
    >
      <SampleMusicGrid preview={samplePreview} {isAdded} {onToggle} {toaster} />
    </div>
  {/if}
</Dialog>

<style>
  .panel {
    display: grid;
    margin-top: 14px;
  }
</style>
