<script lang="ts">
  import { MILLISECONDS_PER_SECOND } from "../../player";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import type { PlaylistView } from "./playlist-view";
  import { songColour } from "./song-colour";
  import { SongDrag, songIndexAfterKey, type SongDragState } from "./song-drag";
  import type { PendingSong } from "./song-intake";

  /**
   * The playlist's songs in play order: a row selects its song for editing, its grip reorders it
   * (dragged, or the arrow keys while focused), its × removes it. Songs on their way in follow.
   */
  let {
    playlist,
    selectedSongId,
    pending,
    onSelect,
    onMove,
    onRemove,
    onDismiss,
  }: {
    playlist: PlaylistView;
    selectedSongId: string;
    pending: readonly PendingSong[];
    onSelect: (songId: string) => void;
    onMove: (songId: string, toIndex: number) => void;
    onRemove: (songId: string) => void;
    /** Takes an unusable file's row away. */
    onDismiss: (key: number) => void;
  } = $props();

  const { t, formatDuration } = getTranslator();
  const PERCENT = 100;
  const duration = (ms: number) => formatDuration(ms / MILLISECONDS_PER_SECOND);

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
    if (refocus !== null && playlist.songs[refocus.toIndex]?.id === refocus.songId) {
      grips[refocus.songId]?.focus();
      refocus = null;
    }
  });

  function onGripKey(event: KeyboardEvent, songId: string, index: number): void {
    const toIndex = songIndexAfterKey(event.key, index, playlist.songs.length);
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
  {#each playlist.songs as song, index (song.id)}
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
      <button
        class="pick"
        type="button"
        aria-pressed={song.id === selectedSongId}
        onclick={() => onSelect(song.id)}
      >
        <span class="number mono" style:background={songColour(song.number)}>{song.number}</span>
        <span class="name">
          <b>{song.fileName}</b>
          <small class="mono">
            {song.trimmed
              ? t("music.trimmedTo", {
                  duration: duration(song.durationMs),
                  excerpt: duration(song.excerptMs),
                })
              : duration(song.durationMs)}
          </small>
        </span>
        <span class="tag mono">
          {song.reached
            ? t("music.songFrom", { time: duration(song.atMs) })
            : t("music.notReached")}
        </span>
      </button>
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
    <li class="song pending" class:unusable={song.kind === "unusable"}>
      <span class="name">
        <b>{song.pickedName}</b>
        {#if song.kind === "converting"}
          <small class="mono">
            {t("music.songConverting", { percent: Math.round(song.progress * PERCENT) })}
          </small>
        {:else if song.kind === "unusable"}
          <small>{t("music.songUnusable")}</small>
        {/if}
      </span>
      {#if song.kind === "unusable"}
        <button
          class="remove"
          type="button"
          aria-label={t("music.removeSong", { name: song.pickedName })}
          onclick={() => onDismiss(song.key)}
        >
          <Icon name="close" />
        </button>
      {:else}
        <span class="pulse" aria-hidden="true"></span>
      {/if}
    </li>
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
  .song.pending {
    grid-template-columns: minmax(0, 1fr) auto;
    padding: 9px 6px 9px 14px;
    border-style: dashed;
  }
  .song.unusable {
    border-color: var(--gl-coral);
    border-style: solid;
    background: color-mix(in srgb, var(--gl-coral) 8%, var(--gl-surface));
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
    grid-template-columns: auto minmax(0, 1fr) auto;
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
  .number {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    color: var(--gl-song-ink);
    font-size: var(--gl-size-small);
    font-weight: var(--gl-weight-semibold);
  }
  .name {
    display: grid;
    min-width: 0;
  }
  .name b {
    overflow: hidden;
    font-size: var(--gl-size-body);
    font-weight: var(--gl-weight-semibold);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .name small,
  .tag {
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
  .pulse {
    width: 8px;
    height: 8px;
    margin: 0 12px;
    border-radius: 50%;
    background: var(--gl-accent);
  }
</style>
