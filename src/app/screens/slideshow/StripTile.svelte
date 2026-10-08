<script lang="ts">
  import Icon from "../../components/Icon.svelte";
  import { getTranslator } from "../../i18n/context";
  import type { PictureTile } from "../view-models";

  /** One picture of the strip: its order number and date, and the marks a pointer reveals. */
  let {
    picture,
    number,
    selected,
    draggable,
    dragging,
    drop,
    removable,
    onPick,
    onKeydown,
    onRemove,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
  }: {
    picture: PictureTile;
    /** The position in play order, from 1. */
    number: number;
    selected: boolean;
    /** Only a mouse drags: a native drag would take over a touch meant to scroll or select. */
    draggable: boolean;
    dragging: boolean;
    /** Where a dragged picture would land, beside this one. */
    drop: "before" | "after" | null;
    /** False for the last picture, which stays. */
    removable: boolean;
    onPick: () => void;
    onKeydown: (event: KeyboardEvent) => void;
    onRemove: () => void;
    onDragStart: (event: DragEvent) => void;
    onDragOver: (event: DragEvent) => void;
    onDrop: (event: DragEvent) => void;
    onDragEnd: () => void;
  } = $props();

  const { t, formatDate } = getTranslator();
  const date = $derived(formatDate(picture.capturedAt));
</script>

<li
  class="tile"
  class:selected
  class:dragging
  class:drop-before={drop === "before"}
  class:drop-after={drop === "after"}
  {draggable}
  ondragstart={onDragStart}
  ondragover={onDragOver}
  ondrop={onDrop}
  ondragend={onDragEnd}
>
  <button
    class="pick"
    type="button"
    data-picture-id={picture.id}
    aria-pressed={selected}
    onclick={onPick}
    onkeydown={onKeydown}
  >
    <img
      src={picture.thumbnailUrl}
      alt={t("slideshow.pictureLabel", { number, date })}
      draggable="false"
    />
    <span class="number mono" aria-hidden="true">{number}</span>
    <span class="date mono" aria-hidden="true">{date}</span>
  </button>
  <span class="mark grab" aria-hidden="true"><Icon name="grip" /></span>
  <button
    class="mark remove"
    type="button"
    aria-label={t("slideshow.removePicture", { number })}
    title={removable ? t("slideshow.remove") : t("slideshow.lastPictureStays")}
    disabled={!removable}
    onclick={onRemove}
  >
    <Icon name="close" />
  </button>
</li>

<style>
  .tile {
    position: relative;
    aspect-ratio: 4 / 3;
    /* The screen's room for the selection bar, while it is shown. */
    scroll-margin-bottom: var(--selection-clearance, 0px);
    border-radius: var(--gl-radius-tile);
    background: var(--gl-hover);
  }
  .tile.selected {
    outline: 3px solid var(--gl-accent);
    outline-offset: 2px;
  }
  .tile.dragging {
    opacity: 0.35;
  }
  /* Where a dragged picture lands: a dashed mark in the gap before or after the tile. */
  .tile.drop-before::before,
  .tile.drop-after::before {
    content: "";
    position: absolute;
    top: -2px;
    bottom: -2px;
    z-index: 3;
    border-left: 3px dashed var(--gl-lemon);
  }
  .tile.drop-before::before {
    left: -7px;
  }
  .tile.drop-after::before {
    right: -7px;
  }
  .pick {
    position: absolute;
    inset: 0;
    display: block;
    padding: 0;
    overflow: hidden;
    border: 0;
    border-radius: inherit;
    background: none;
    color: inherit;
    cursor: pointer;
    touch-action: manipulation;
  }
  .pick:focus-visible {
    outline: 3px solid var(--gl-accent);
    outline-offset: 2px;
  }
  .pick img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .number,
  .date {
    position: absolute;
    color: var(--gl-on-photo);
    font-weight: var(--gl-weight-medium);
    font-size: var(--gl-size-caption);
    text-align: left;
  }
  .number {
    left: 6px;
    top: 6px;
    padding: 1px 6px;
    border-radius: var(--gl-radius-small);
    background: var(--gl-photo-badge);
  }
  .date {
    left: 0;
    right: 0;
    bottom: 0;
    padding: 14px 7px 5px;
    background: linear-gradient(transparent, var(--gl-photo-fade));
  }
  .mark {
    position: absolute;
    top: 5px;
    z-index: 2;
    display: none;
    place-items: center;
    width: 26px;
    height: 26px;
    padding: 0;
    border: 0;
    border-radius: var(--gl-radius-small);
    background: var(--gl-photo-badge);
    color: var(--gl-on-photo);
    backdrop-filter: blur(6px);
    opacity: 0;
    transition: opacity 0.12s;
    --gl-icon-size: var(--gl-size-icon-small);
  }
  .remove {
    right: 5px;
    cursor: pointer;
  }
  .remove:hover:not(:disabled) {
    background: var(--gl-coral);
    color: var(--gl-coral-ink);
  }
  .remove:disabled {
    cursor: not-allowed;
  }
  .grab {
    right: 35px;
    cursor: grab;
    pointer-events: none;
  }
  /* Marks for a mouse only; touch selects a tile and uses the selection bar. */
  @media (hover: hover) and (pointer: fine) {
    .mark {
      display: grid;
    }
    .tile:hover .mark,
    .tile.selected .mark,
    .tile:focus-within .mark {
      opacity: 1;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .mark {
      transition: none;
    }
  }
</style>
