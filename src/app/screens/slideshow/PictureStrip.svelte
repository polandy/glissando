<script lang="ts">
  import { tick } from "svelte";
  import type { PictureTile } from "../view-models";
  import StripTile from "./StripTile.svelte";
  import { dropIndex, stripKeyAction } from "./strip-keys";

  /** The pictures in play order as tiles: select, remove, and reorder by drag or keyboard. */
  let {
    pictures,
    selectedId,
    onSelect,
    onRemove,
    onMove,
  }: {
    pictures: readonly PictureTile[];
    selectedId: string | null;
    onSelect: (pictureId: string | null) => void;
    onRemove: (pictureId: string) => void;
    onMove: (pictureId: string, toIndex: number) => void;
  } = $props();

  let strip: HTMLOListElement;
  let draggedId = $state<string | null>(null);
  let dropMark = $state<{ readonly id: string; readonly after: boolean } | null>(null);
  const lastPicture = $derived(pictures.length < 2);

  /** The grid's column count, for moving up and down by a row. */
  function columns(): number {
    return getComputedStyle(strip).gridTemplateColumns.split(" ").length;
  }

  async function focusTile(pictureId: string): Promise<void> {
    await tick();
    strip.querySelector<HTMLElement>(`[data-picture-id="${pictureId}"]`)?.focus();
  }

  function keydown(event: KeyboardEvent, pictureId: string, index: number): void {
    const action = stripKeyAction(event, index, pictures.length, columns());
    if (action === null) {
      return;
    }
    event.preventDefault();
    switch (action.kind) {
      case "toggle":
        onSelect(selectedId === pictureId ? null : pictureId);
        break;
      case "deselect":
        onSelect(null);
        break;
      case "focus": {
        const next = pictures[action.index]?.id;
        if (next !== undefined) {
          if (selectedId !== null) {
            onSelect(next);
          }
          void focusTile(next);
        }
        break;
      }
      case "move":
        onSelect(pictureId);
        onMove(pictureId, action.to);
        void focusTile(pictureId);
        break;
      case "remove":
        removeByKey(pictureId, index);
        break;
      case "none":
        break;
    }
  }

  /** The focus, and a selection, pass to the tile that takes the removed one's place. */
  function removeByKey(pictureId: string, index: number): void {
    if (lastPicture) {
      // Answered with why it stays; the focus and selection stay too.
      onRemove(pictureId);
      return;
    }
    const neighbour = pictures[index + 1]?.id ?? pictures[index - 1]?.id ?? null;
    const wasSelected = selectedId === pictureId;
    onRemove(pictureId);
    if (neighbour !== null) {
      if (wasSelected) {
        onSelect(neighbour);
      }
      void focusTile(neighbour);
    }
  }

  function dragStart(event: DragEvent, pictureId: string): void {
    draggedId = pictureId;
    if (event.dataTransfer !== null) {
      event.dataTransfer.effectAllowed = "move";
      // Firefox starts a drag only with some data set.
      event.dataTransfer.setData("text/plain", pictureId);
    }
  }

  function dragOver(event: DragEvent, pictureId: string): void {
    if (draggedId === null) {
      return;
    }
    event.preventDefault();
    const tile = event.currentTarget as HTMLElement;
    const box = tile.getBoundingClientRect();
    const after = event.clientX > box.left + box.width / 2;
    dropMark = pictureId === draggedId ? null : { id: pictureId, after };
  }

  function drop(event: DragEvent, targetIndex: number): void {
    if (draggedId === null) {
      return;
    }
    event.preventDefault();
    const from = pictures.findIndex((picture) => picture.id === draggedId);
    if (dropMark !== null && from >= 0) {
      onMove(draggedId, dropIndex(from, targetIndex, dropMark.after));
    }
    dragEnd();
  }

  function dragEnd(): void {
    draggedId = null;
    dropMark = null;
  }
</script>

<ol class="strip" bind:this={strip}>
  {#each pictures as picture, index (picture.id)}
    <StripTile
      {picture}
      number={index + 1}
      selected={picture.id === selectedId}
      dragging={picture.id === draggedId}
      drop={dropMark?.id === picture.id ? (dropMark.after ? "after" : "before") : null}
      removable={!lastPicture}
      onPick={() => onSelect(picture.id === selectedId ? null : picture.id)}
      onKeydown={(event) => keydown(event, picture.id, index)}
      onRemove={() => onRemove(picture.id)}
      onDragStart={(event) => dragStart(event, picture.id)}
      onDragOver={(event) => dragOver(event, picture.id)}
      onDrop={(event) => drop(event, index)}
      onDragEnd={dragEnd}
    />
  {/each}
</ol>

<style>
  .strip {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  @container (max-width: 720px) {
    .strip {
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
    }
  }
</style>
