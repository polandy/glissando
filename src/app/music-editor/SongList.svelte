<script lang="ts">
  import type { Snippet } from "svelte";
  import type { SampleTrackId } from "../../sample-music/sample-tracks";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import type { SampleSongRow } from "../sample-music/sample-song-pick";
  import type { PlaylistSongView } from "./playlist-view";
  import PendingRow from "./PendingRow.svelte";
  import SongLabel from "./SongLabel.svelte";
  import { SongDrag, songIndexAfterKey, type SongDragState } from "./song-drag";
  import type { PendingSong } from "./song-intake";

  /**
   * The playlist's songs in play order, then pending picks and sample downloads. A row selects
   * its song, its grip reorders it (dragged or by arrow key), its × removes it.
   */
  let {
    songs,
    selectedSongId,
    pending,
    sampleRows,
    onSelect,
    detail,
    onMove,
    onRemove,
    onDismiss,
    onRemoveSampleRow,
  }: {
    songs: readonly PlaylistSongView[];
    /** Without it, a row selects nothing. */
    selectedSongId?: string;
    pending: readonly PendingSong[];
    sampleRows: readonly SampleSongRow[];
    onSelect?: (songId: string) => void;
    /** The line under a song's name; by default its length and excerpt. */
    detail?: Snippet<[PlaylistSongView]>;
    onMove: (songId: string, toIndex: number) => void;
    onRemove: (songId: string) => void;
    /** Takes an unusable file's, or a failed sample download's, row away. */
    onDismiss: (key: number) => void;
    onRemoveSampleRow: (trackId: SampleTrackId) => void;
  } = $props();

  const { t } = getTranslator();
  const PERCENT = 100;

  const rowElements: HTMLElement[] = $state([]);
  const grips: Record<string, HTMLButtonElement> = $state({});
  let dragState = $state.raw<SongDragState | null>(null);
  const drag = new SongDrag({
    rows: () => rowElements.map((row) => row.getBoundingClientRect()),
    onMove: (songId, toIndex) => onMove(songId, toIndex),
  });

  /** A song moved by its keys keeps the focus on its grip once it has moved. */
  let refocus = $state.raw<{ songId: string; toIndex: number } | null>(null);
  $effect(() => {
    if (refocus !== null && songs[refocus.toIndex]?.id === refocus.songId) {
      grips[refocus.songId]?.focus();
      refocus = null;
    }
  });

  function onGripKey(event: KeyboardEvent, songId: string, index: number): void {
    const toIndex = songIndexAfterKey(event.key, index, songs.length);
    if (toIndex === null) return;
    event.preventDefault();
    refocus = { songId, toIndex };
    onMove(songId, toIndex);
  }

  function track(change: () => void): void {
    change();
    dragState = drag.state;
  }
</script>

<svelte:window
  onpointermove={(event) =>
    track(() => drag.move({ pointerId: event.pointerId, y: event.clientY }))}
  onpointerup={(event) => track(() => drag.up({ pointerId: event.pointerId }))}
  onpointercancel={() => track(() => drag.cancel())}
/>

<ol class="songs" aria-label={t("music.songs")}>
  {#each songs as song, index (song.id)}
    <li
      bind:this={rowElements[index]}
      class="song"
      class:selected={song.id === selectedSongId}
      class:unreached={!song.reached}
      class:dragging={dragState?.songId === song.id}
      class:drop={dragState !== null &&
        dragState.overIndex === index &&
        dragState.songId !== song.id}
    >
      <button
        bind:this={grips[song.id]}
        class="grip"
        type="button"
        aria-label={t("music.moveSong", { name: song.fileName })}
        onpointerdown={(event) => {
          event.preventDefault();
          track(() =>
            drag.down({ songId: song.id, index, pointerId: event.pointerId, y: event.clientY }),
          );
        }}
        onkeydown={(event) => onGripKey(event, song.id, index)}
      >
        <Icon name="grip" />
      </button>
      {#if onSelect === undefined}
        <div class="pick"><SongLabel {song} {detail} /></div>
      {:else}
        <button
          class="pick"
          type="button"
          aria-pressed={song.id === selectedSongId}
          onclick={() => onSelect(song.id)}
        >
          <SongLabel {song} {detail} />
        </button>
      {/if}
      <button
        class="remove"
        type="button"
        aria-label={t("music.removeSong", { name: song.fileName })}
        onclick={() => onRemove(song.id)}
      >
        <Icon name="close" />
      </button>
    </li>
  {/each}
  {#each pending as song (song.key)}
    {@const status =
      song.kind === "converting"
        ? t("music.songConverting", { percent: Math.round(song.progress * PERCENT) })
        : song.kind === "unusable"
          ? t("music.songUnusable")
          : undefined}
    <PendingRow
      title={song.pickedName}
      {...status !== undefined ? { status } : {}}
      failed={song.kind === "unusable"}
      removeLabel={t("music.removeSong", { name: song.pickedName })}
      onRemove={() => onDismiss(song.key)}
    />
  {/each}
  {#each sampleRows as row (row.trackId)}
    <PendingRow
      title={row.title}
      status={row.kind === "downloadingSample"
        ? t("sampleMusicPicker.downloading", { percent: Math.round(row.progress * PERCENT) })
        : t("sampleMusicPicker.downloadFailed")}
      {...row.kind === "downloadingSample" ? { progress: row.progress } : {}}
      failed={row.kind === "failedSampleDownload"}
      removeLabel={t("music.removeSong", { name: row.title })}
      onRemove={() => onRemoveSampleRow(row.trackId)}
    />
  {/each}
</ol>

<style>
  .songs {
    display: grid;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .song {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 4px;
    padding: 4px 6px 4px 4px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
    background: var(--gl-surface);
  }
  .song.selected {
    border-color: var(--gl-accent);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--gl-accent) 35%, transparent);
  }
  .song.unreached .pick {
    opacity: 0.5;
  }
  .song.dragging {
    opacity: 0.6;
  }
  .song.drop {
    outline: 2px dashed var(--gl-accent);
    outline-offset: 1px;
  }
  .grip,
  .remove {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--gl-muted);
    cursor: pointer;
  }
  .grip {
    cursor: grab;
    touch-action: none;
    user-select: none;
  }
  .grip:hover,
  .remove:hover {
    background: var(--gl-hover);
    color: var(--gl-ink);
  }
  .pick {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 10px;
    padding: 5px 4px;
    border: 0;
    border-radius: var(--gl-radius-small);
    background: transparent;
    color: var(--gl-ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
</style>
