<script lang="ts">
  import type { SlideshowLook } from "../../../player";
  import { getTranslator } from "../../i18n/context";

  /**
   * One choice of the look radiogroup: the preview picture graded with that look, or a plain
   * swatch while the slideshow has no picture to show.
   */
  let {
    look,
    checked,
    tag,
    pictureUrl,
    filterUrl,
    radio = $bindable(),
    onPick,
    onKeydown,
  }: {
    look: SlideshowLook;
    checked: boolean;
    /** Marks the choice the setting falls back to ("Default"); null for every other tile. */
    tag: string | null;
    /** The preview picture to grade; null while the slideshow has none. */
    pictureUrl: string | null;
    /** This tile's own look, as a CSS `filter` value; "" for None. */
    filterUrl: string;
    radio?: HTMLButtonElement | undefined;
    onPick: () => void;
    onKeydown: (event: KeyboardEvent) => void;
  } = $props();

  const { t } = getTranslator();
</script>

<button
  bind:this={radio}
  class="tile"
  type="button"
  role="radio"
  aria-checked={checked}
  tabindex={checked ? 0 : -1}
  data-look={look}
  onclick={onPick}
  onkeydown={onKeydown}
>
  <span class="sw" class:plain={pictureUrl === null}>
    {#if pictureUrl !== null}
      <img src={pictureUrl} alt="" style:filter={filterUrl} />
    {/if}
    {#if tag !== null}<span class="tag">{tag}</span>{/if}
  </span>
  <span class="name">{t(`look.${look}`)}</span>
</button>

<style>
  .tile {
    display: grid;
    gap: 5px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--gl-ink);
    font: inherit;
    font-size: var(--gl-size-small);
    font-weight: var(--gl-weight-medium);
    text-align: center;
    cursor: pointer;
  }
  .tile:focus-visible {
    outline: 2px solid var(--gl-accent);
    outline-offset: 3px;
    border-radius: var(--gl-radius-small);
  }
  .sw {
    position: relative;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border-radius: var(--gl-radius-small);
    outline: 1.5px solid var(--gl-line);
    background: var(--gl-player-bg);
  }
  .sw.plain {
    background: var(--gl-hover);
  }
  [aria-checked="true"] .sw {
    outline: 2.5px solid var(--gl-accent);
    outline-offset: 2px;
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .tag {
    position: absolute;
    top: 3px;
    right: 3px;
    padding: 1px 4px;
    border-radius: var(--gl-radius-small);
    background: var(--gl-photo-badge);
    color: var(--gl-on-photo);
    font-size: var(--gl-size-caption);
    font-weight: var(--gl-weight-semibold);
    letter-spacing: var(--gl-tracking-eyebrow);
    text-transform: uppercase;
  }
</style>
