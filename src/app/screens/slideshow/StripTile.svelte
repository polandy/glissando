<script lang="ts">
  import Icon from "../../components/Icon.svelte";
  import { getTranslator } from "../../i18n/context";
  import { MILLISECONDS_PER_SECOND } from "../../../player";
  import type { PictureTile } from "../view-models";
  import StripTileBadges from "./StripTileBadges.svelte";

  /** One picture of the strip: its order number and date, and the marks a pointer reveals. */
  let {
    picture,
    number,
    selected,
    selecting,
    isNew,
    mousePointer,
    dragging,
    drop,
    removable,
    onPick,
    onOpen,
    onKeydown,
    onRemove,
  }: {
    picture: PictureTile;
    /** The position in play order, from 1. */
    number: number;
    selected: boolean;
    /** Selecting several (dev-docs/APP.md, Selecting several): every tile shows a check circle. */
    selecting: boolean;
    /** Just added: outlined and badged while the screen is shown. */
    isNew: boolean;
    /** The primary pointer is a mouse: a double-click opens the picture editor. */
    mousePointer: boolean;
    /** Carried by the drag over the strip (ADR-0019): faded while it moves with the pointer. */
    dragging: boolean;
    /** Where a dragged group would land, beside this one. */
    drop: "before" | "after" | null;
    /** False for the last picture, which stays. */
    removable: boolean;
    onPick: (event: MouseEvent) => void;
    /** A double-click with a mouse: opens the picture editor. */
    onOpen: () => void;
    onKeydown: (event: KeyboardEvent) => void;
    onRemove: () => void;
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
  class:selecting-mode={selecting}
  class:new={isNew}
  class:dragging
  class:drop-before={drop === "before"}
  class:drop-after={drop === "after"}
>
  <button
    class="pick"
    type="button"
    data-picture-id={picture.id}
    aria-pressed={selected}
    onclick={onPick}
    ondblclick={() => {
      // A double tap on a touch screen is two taps: it selects and deselects.
      if (mousePointer) {
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
      <StripTileBadges {picture} {isNew} {ownSeconds} />
    {/if}
    <span class="date mono" aria-hidden="true">{date}</span>
  </button>
  <span class="check" aria-hidden="true"><Icon name="check" /></span>
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
    -webkit-touch-callout: none;
    user-select: none;
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
  /* The selected tile's order number, in the accent (dev-docs/APP.md, Select and reorder). */
  .tile.selected .number {
    background: var(--gl-accent);
    color: var(--gl-accent-ink);
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
  /* Selecting several (dev-docs/APP.md, Selecting several): a check circle instead of the marks. */
  .check {
    position: absolute;
    top: 6px;
    right: 6px;
    z-index: 2;
    display: none;
    place-items: center;
    width: 22px;
    height: 22px;
    border: 2px solid var(--gl-on-photo);
    border-radius: var(--gl-radius-pill);
    background: var(--gl-photo-badge);
    color: transparent;
    --gl-icon-size: 13px;
  }
  .tile.selecting-mode .check {
    display: grid;
  }
  .tile.selecting-mode .mark {
    display: none;
  }
  .tile.selected .check {
    border-color: var(--gl-accent);
    background: var(--gl-accent);
    color: var(--gl-accent-ink);
  }
  /* A bold check: the icon set's hairline stroke vanishes at this size on the accent. */
  .check :global(svg) {
    stroke-width: 3.2;
  }
  /* While selecting several, the unpicked tiles step back and a picked picture sits inset. */
  .tile.selecting-mode:not(.selected) .pick img {
    filter: saturate(0.8) brightness(0.92);
  }
  .tile.selecting-mode .pick img {
    transition: scale 0.12s;
  }
  .tile.selecting-mode.selected .pick img {
    scale: 0.94;
    border-radius: var(--gl-radius-small);
  }
  @media (prefers-reduced-motion: reduce) {
    .mark,
    .tile.selecting-mode .pick img {
      transition: none;
    }
  }
</style>
