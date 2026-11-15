<script lang="ts">
  import { getTranslator } from "../../i18n/context";
  import { MILLISECONDS_PER_SECOND } from "../../../player";
  import type { PictureTile } from "../view-models";
  import PairSplitButton from "./PairSplitButton.svelte";
  import StripTileBadges from "./StripTileBadges.svelte";
  import StripTileCheck from "./StripTileCheck.svelte";
  import StripTileMarks from "./StripTileMarks.svelte";

  /** One picture of the strip: its order number and date, and the grab handle a mouse reveals. */
  let {
    picture,
    number,
    selected,
    selecting,
    isNew,
    lookFilter,
    mousePointer,
    dragging,
    drop,
    onPick,
    onOpen,
    onKeydown,
    partnerSelected = false,
    onSplitPair,
  }: {
    picture: PictureTile;
    /** The position in play order, from 1. */
    number: number;
    selected: boolean;
    /** Selecting several (docs/dev/app/slideshow-editing/SELECTING_SEVERAL.md, Selecting several): every tile shows a check circle. */
    selecting: boolean;
    /** Just added: outlined and badged while the screen is shown. */
    isNew: boolean;
    /** The slideshow's look, as a resolved CSS `filter` value ("" for "none", LOOKS.md). */
    lookFilter: string;
    /** The primary pointer is a mouse: a double-click opens the picture editor. */
    mousePointer: boolean;
    /** Carried by the drag over the strip (ADR-0019): faded while it moves with the pointer. */
    dragging: boolean;
    /** Where a dragged group would land, beside this one. */
    drop: "before" | "after" | null;
    onPick: (event: MouseEvent) => void;
    /** A double-click with a mouse: opens the picture editor. */
    onOpen: () => void;
    onKeydown: (event: KeyboardEvent) => void;
    /** The picture this one shares a slide with is selected. */
    partnerSelected?: boolean;
    /** Splits the pair this picture belongs to; without it, the pair shows no scissors. */
    onSplitPair?: (() => void) | undefined;
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
      picture.pairedWithNumber === null
        ? ""
        : t("slideshow.pairedWith", { number: picture.pairedWithNumber }),
      picture.alone ? t("slideshow.pictureLabelAlone") : "",
      picture.blurredFill ? t("slideshow.pictureLabelBlurredFill") : "",
    ].join(""),
  );
  const label = $derived(isNew ? t("add.newLabel", { label: ownLabel }) : ownLabel);
  const partner = $derived(picture.pairedWithNumber);
</script>

<li
  class="tile"
  class:selected
  class:selecting-mode={selecting}
  class:new={isNew}
  class:dragging
  class:drop-before={drop === "before"}
  class:drop-after={drop === "after"}
  class:paired-first={partner !== null && partner > number}
  class:paired-second={partner !== null && partner < number}
>
  <button
    class="pick"
    type="button"
    data-picture-id={picture.id}
    data-view-id={picture.id}
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
      <img src={picture.thumbnailUrl} alt={label} draggable="false" style:filter={lookFilter} />
    {/if}
    <span class="number mono" aria-hidden="true">{number}</span>
    {#if isNew || picture.clipMs !== undefined || picture.ownMotion || ownSeconds !== null || picture.ownTransition !== null || picture.alone || picture.blurredFill}
      <StripTileBadges {picture} {isNew} {ownSeconds} />
    {/if}
    <span class="date mono" aria-hidden="true">{date}</span>
  </button>
  <StripTileCheck {selecting} {selected} />
  <StripTileMarks />
  {#if partner !== null && partner > number && onSplitPair !== undefined}
    <PairSplitButton
      first={number}
      second={partner}
      shown={!selecting && (selected || partnerSelected)}
      onSplit={onSplitPair}
    />
  {/if}
</li>

<style>
  .tile {
    position: relative;
    aspect-ratio: 4 / 3;
    /* The screen's room for the selection bar, while it is shown. */
    scroll-margin-bottom: var(--selection-clearance, 0px);
    border-radius: var(--gl-radius-tile);
    background: var(--gl-hover);
    /* The strip sets its gap; a tile shown on its own assumes the widest one. */
    --tile-gap: var(--strip-gap, 10px);
    --plate-reach: calc(var(--tile-gap) / -2 + 1px);
    --plate-radius: calc(var(--gl-radius-tile) - var(--plate-reach));
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
  /* A pair's two tiles (ADR-0028): one plate behind both, each drawing its half up to the middle
     of the gap; open (dashed) where a row break or a chapter cuts the pair (`pair-cuts.ts`). */
  .tile.paired-first::after,
  .tile.paired-second::after {
    content: "";
    position: absolute;
    /* Short of the middle of the gap, so the plates of two rows never touch. */
    inset: var(--plate-reach);
    z-index: -1;
    border: 2px solid var(--gl-pair-edge);
    background: var(--gl-pair-plate);
  }
  .tile.paired-first::after {
    right: calc(var(--tile-gap) / -2 - 1px);
    border-right: 0;
    border-radius: var(--plate-radius) 0 0 var(--plate-radius);
  }
  .tile.paired-second::after {
    left: calc(var(--tile-gap) / -2 - 1px);
    border-left: 0;
    border-radius: 0 var(--plate-radius) var(--plate-radius) 0;
  }
  .tile.paired-first:global([data-pair-cut])::after {
    right: var(--plate-reach);
    border-right: 2px dashed var(--gl-pair-edge);
  }
  .tile.paired-second:global([data-pair-cut])::after {
    left: var(--plate-reach);
    border-left: 2px dashed var(--gl-pair-edge);
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
  /* The selected tile's order number, in the accent (docs/dev/app/slideshow-editing/REMOVE_SELECT_REORDER.md, Select and reorder). */
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
  /* Selecting several (docs/dev/app/slideshow-editing/SELECTING_SEVERAL.md, Selecting several): the check circle instead of the marks. */
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
    .tile.selecting-mode .pick img {
      transition: none;
    }
  }
</style>
