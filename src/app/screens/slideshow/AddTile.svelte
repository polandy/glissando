<script lang="ts">
  import Icon from "../../components/Icon.svelte";
  import { getTranslator } from "../../i18n/context";

  /**
   * The strip's last tile: a dashed "+" placeholder that adds pictures where they will appear.
   * Deliberately without the `.pick` class or `data-picture-id` (PictureStrip.svelte's `hitTest`
   * and `pointerDown` gate drag, select and reorder on those), so it takes no part in them.
   */
  let { onAdd }: { onAdd: () => void } = $props();

  const { t } = getTranslator();
</script>

<li class="tile">
  <button class="add-tile" type="button" onclick={onAdd}>
    <Icon name="plus" />
    <span class="label">{t("add.titleShort")}</span>
  </button>
</li>

<style>
  .tile {
    position: relative;
    aspect-ratio: 4 / 3;
  }
  .add-tile {
    position: absolute;
    inset: 0;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 6px;
    padding: 0;
    border: 1.5px dashed var(--gl-line);
    border-radius: var(--gl-radius-tile);
    background: transparent;
    color: var(--gl-muted);
    cursor: pointer;
  }
  .add-tile:hover {
    background: var(--gl-hover);
  }
  .add-tile:focus-visible {
    outline: 3px solid var(--gl-accent);
    outline-offset: 2px;
  }
  .label {
    padding: 1px 6px;
    font-size: var(--gl-size-caption);
  }
</style>
