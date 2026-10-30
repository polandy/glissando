<script lang="ts">
  import type { PictureTile } from "../view-models";

  /** Up to the first four pictures, graded with the look under preview, to switch the preview to. */
  let {
    pictures,
    previewIndex,
    filterUrl,
    onPick,
  }: {
    pictures: readonly PictureTile[];
    previewIndex: number;
    /** The look under preview, as a CSS `filter` value; "" for None. */
    filterUrl: string;
    onPick: (index: number) => void;
  } = $props();
</script>

<div class="row" role="group">
  {#each pictures as picture, index (picture.id)}
    <button
      class="pick"
      type="button"
      aria-current={index === previewIndex}
      onclick={() => onPick(index)}
    >
      <img src={picture.thumbnailUrl} alt="" style:filter={filterUrl} />
    </button>
  {/each}
</div>

<style>
  .row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }
  .pick {
    padding: 0;
    border: 0;
    border-radius: var(--gl-radius-small);
    outline: 1.5px solid var(--gl-line);
    overflow: hidden;
    aspect-ratio: 16 / 9;
    cursor: pointer;
  }
  .pick:focus-visible {
    outline: 2px solid var(--gl-accent);
    outline-offset: 2px;
  }
  [aria-current="true"] {
    outline: 2.5px solid var(--gl-accent);
    outline-offset: 1px;
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
</style>
