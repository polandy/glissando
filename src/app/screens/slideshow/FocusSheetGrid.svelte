<script lang="ts">
  import type { PicturesFocus } from "../../focus/pictures-focus";
  import { getTranslator } from "../../i18n/context";
  import { FOCUS_STATUS_COLOR, FOCUS_STATUS_LABEL_KEY, focusSheetTiles } from "./focus-sheet-view";
  import type { FocusSheetFilter } from "./focus-sheet-view";

  /** One dot-marked tile per picture, dimmed outside the legend's filter; a tap opens the editor. */
  let {
    focus,
    pictures,
    passPaused,
    filter,
    onEdit,
  }: {
    focus: PicturesFocus;
    pictures: readonly {
      readonly id: string;
      readonly thumbnailUrl: string;
      readonly ownMotion: boolean;
    }[];
    passPaused: boolean;
    filter: FocusSheetFilter;
    onEdit: (pictureId: string) => void;
  } = $props();

  const { t } = getTranslator();

  const tiles = $derived(focusSheetTiles(focus, pictures, passPaused, filter));
</script>

<div class="grid">
  {#each tiles as tile (tile.id)}
    <button
      class="tile"
      class:dim={tile.dimmed}
      type="button"
      title={t(FOCUS_STATUS_LABEL_KEY[tile.status])}
      onclick={() => onEdit(tile.id)}
    >
      <img alt="" src={tile.thumbnailUrl} />
      <span class="dot" style:background={FOCUS_STATUS_COLOR[tile.status]}></span>
      {#if tile.ownMotion}
        <span class="own">{t("focusSheet.ownMotion")}</span>
      {/if}
    </button>
  {/each}
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }
  .tile {
    position: relative;
    padding: 0;
    border: 0;
    border-radius: var(--gl-radius-small);
    background: none;
    overflow: hidden;
    cursor: pointer;
  }
  .tile img {
    display: block;
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
  }
  .tile.dim img {
    opacity: 0.35;
  }
  .dot {
    position: absolute;
    bottom: 5px;
    left: 5px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    box-shadow: 0 0 0 2px var(--gl-photo-badge);
  }
  .own {
    position: absolute;
    top: 4px;
    right: 4px;
    padding: 1px 6px;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-photo-badge);
    color: var(--gl-on-photo);
    font-size: var(--gl-size-caption);
  }
</style>
