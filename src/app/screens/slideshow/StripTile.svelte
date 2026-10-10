<script lang="ts">
  import Icon from "../../components/Icon.svelte";
  import { getTranslator } from "../../i18n/context";
  import { MILLISECONDS_PER_SECOND } from "../../../player";
  import type { PictureTile } from "../view-models";

  /** One picture of the strip: its order number and date, and the marks a pointer reveals. */
  let {
    picture,
    number,
    selected,
    isNew,
    draggable,
    dragging,
    drop,
    removable,
    onPick,
    onOpen,
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
    /** Just added: outlined and badged while the screen is shown. */
    isNew: boolean;
    /** Only a mouse drags: a native drag would take over a touch meant to scroll or select. */
    draggable: boolean;
    dragging: boolean;
    /** Where a dragged picture would land, beside this one. */
    drop: "before" | "after" | null;
    /** False for the last picture, which stays. */
    removable: boolean;
    onPick: () => void;
    /** A double-click with a mouse: opens the picture editor. */
    onOpen: () => void;
    onKeydown: (event: KeyboardEvent) => void;
    onRemove: () => void;
    onDragStart: (event: DragEvent) => void;
    onDragOver: (event: DragEvent) => void;
    onDrop: (event: DragEvent) => void;
    onDragEnd: () => void;
  } = $props();

  const { t, formatDate, formatSeconds } = getTranslator();
  const date = $derived(formatDate(picture.capturedAt));
  const ownSeconds = $derived(
    picture.ownDurationMs === null
      ? null
      : formatSeconds(picture.ownDurationMs / MILLISECONDS_PER_SECOND),
  );
  const ownLabel = $derived(
    [
      picture.ownMotion
        ? t("slideshow.pictureLabelOwnMotion", { number, date })
        : t("slideshow.pictureLabel", { number, date }),
      ownSeconds === null ? "" : t("slideshow.pictureLabelOwnDuration", { duration: ownSeconds }),
      picture.ownTransition === null
        ? ""
        : t("slideshow.pictureLabelOwnTransition", {
            effect: t(`effect.${picture.ownTransition}`),
          }),
    ].join(""),
  );
  const label = $derived(isNew ? t("add.newLabel", { label: ownLabel }) : ownLabel);
</script>

<li
  class="tile"
  class:selected
  class:new={isNew}
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
    ondblclick={() => {
      // A double tap on a touch screen is two taps: it selects and deselects.
      if (draggable) {
        onOpen();
      }
    }}
    onkeydown={onKeydown}
  >
    {#if picture.missing}
      <span class="missing" role="img" aria-label={label}>{t("server.missingTile")}</span>
    {:else}
      <img src={picture.thumbnailUrl} alt={label} draggable="false" />
    {/if}
    <span class="number mono" aria-hidden="true">{number}</span>
    {#if isNew || picture.ownMotion || ownSeconds !== null || picture.ownTransition !== null}
      <span class="badges" aria-hidden="true">
        {#if isNew}
          <span class="badge new-badge">{t("add.newBadge")}</span>
        {/if}
        {#if picture.ownMotion}
          <span class="badge"><Icon name="frame" />{t("slideshow.ownMotionBadge")}</span>
        {/if}
        {#if ownSeconds !== null}
          <span class="badge timing-badge mono"><Icon name="clock" />{ownSeconds}</span>
        {/if}
        {#if picture.ownTransition !== null}
          <span class="badge timing-badge" title={t(`effect.${picture.ownTransition}`)}
            ><Icon name="transition" /></span
          >
        {/if}
      </span>
    {/if}
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
  .tile.new:not(.selected) {
    outline: 2px solid var(--gl-accent);
    outline-offset: 2px;
  }
  .badge.new-badge {
    background: var(--gl-accent);
    color: var(--gl-accent-ink);
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
  .missing {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 8px;
    border: 1.5px dashed var(--gl-line);
    border-radius: inherit;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
    text-align: center;
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
  .badges {
    position: absolute;
    right: 6px;
    bottom: 22px;
    display: flex;
    gap: 4px;
  }
  .badge {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 1px 6px;
    border-radius: var(--gl-radius-small);
    background: var(--gl-photo-badge);
    color: var(--gl-on-photo);
    font-size: var(--gl-size-caption);
    font-weight: var(--gl-weight-semibold);
    --gl-icon-size: var(--gl-size-caption);
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
