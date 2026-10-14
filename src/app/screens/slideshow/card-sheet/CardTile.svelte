<script lang="ts">
  import type { StoredCard } from "../../../../library/stored-slideshow";
  import Icon from "../../../components/Icon.svelte";
  import type { PictureTile } from "../../view-models";
  import CardFace from "./CardFace.svelte";
  import { CARD_PREVIEW_SETTLED_MS, pictureUrlFor, previewFace } from "./card-preview-model";

  /**
   * The strip's title slide / closing slide tile (TITLE_SLIDES.md): a dashed "+" placeholder for
   * an absent card or one with no title, otherwise a still of the card at the end of its enter
   * phase. Deliberately without the `.pick` class or `data-picture-id` (PictureStrip.svelte's
   * `hitTest`/`pointerDown` gate drag, select and reorder on those), so it takes no part in them.
   */
  let {
    card,
    pictures,
    label,
    onOpen,
  }: {
    card: StoredCard | undefined;
    pictures: readonly PictureTile[];
    label: string;
    onOpen: () => void;
  } = $props();

  const empty = $derived(card === undefined || card.title === "");
  const face = $derived(card === undefined || empty ? null : previewFace(card));
  const pictureUrl = $derived(
    face?.pictureId === undefined ? undefined : pictureUrlFor(pictures, face.pictureId),
  );

  let button: HTMLButtonElement;
  export function focus(): void {
    button.focus();
  }
</script>

<li class="tile">
  <button bind:this={button} class="card-tile" class:empty type="button" onclick={onOpen}>
    {#if face !== null}
      <div class="still">
        <CardFace
          card={face.card}
          ground={face.ground}
          {pictureUrl}
          elapsedMs={CARD_PREVIEW_SETTLED_MS}
        />
      </div>
    {:else}
      <Icon name="plus" />
    {/if}
    <span class="label mono">{label}</span>
  </button>
</li>

<style>
  .tile {
    position: relative;
    aspect-ratio: 4 / 3;
  }
  .card-tile {
    position: absolute;
    inset: 0;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 6px;
    padding: 0;
    overflow: hidden;
    border: 0;
    border-radius: var(--gl-radius-tile);
    background: var(--gl-hover);
    color: inherit;
    cursor: pointer;
  }
  .card-tile.empty {
    border: 1.5px dashed var(--gl-line);
    color: var(--gl-muted);
  }
  .card-tile:focus-visible {
    outline: 3px solid var(--gl-accent);
    outline-offset: 2px;
  }
  .still {
    position: absolute;
    inset: 0;
  }
  .label {
    position: relative;
    padding: 1px 6px;
    font-size: var(--gl-size-caption);
  }
  .card-tile:not(.empty) .label {
    position: absolute;
    left: 6px;
    bottom: 6px;
    border-radius: var(--gl-radius-small);
    background: var(--gl-photo-badge);
    color: var(--gl-on-photo);
  }
</style>
