<script lang="ts">
  import Icon from "../../components/Icon.svelte";
  import { getTranslator } from "../../i18n/context";

  /** A strip tile's pointer-only marks: the grab handle and the remove button. */
  let {
    number,
    removable,
    onRemove,
  }: {
    /** The position in play order, from 1, named in the remove button's label. */
    number: number;
    /** False for the last picture, which stays. */
    removable: boolean;
    onRemove: () => void;
  } = $props();

  const { t } = getTranslator();
</script>

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

<style>
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
    :global(.tile:hover) .mark,
    :global(.tile.selected) .mark,
    :global(.tile:focus-within) .mark {
      opacity: 1;
    }
    /* The selection bar removes the selected picture: one remove button is enough. */
    :global(.tile.selected) .remove {
      display: none;
    }
  }
  /* Selecting several (dev-docs/app/slideshow-editing/SELECTING_SEVERAL.md, Selecting several): the check circle instead of the marks. */
  :global(.tile.selecting-mode) .mark {
    display: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .mark {
      transition: none;
    }
  }
</style>
