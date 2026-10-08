<script lang="ts">
  import { getTranslator } from "../i18n/context";
  import FileGlyph from "./FileGlyph.svelte";

  /** Over a screen while a file is dragged onto it: dropping opens it as a slideshow. */
  const { t } = getTranslator();
</script>

<div class="layer" aria-hidden="true">
  <span><FileGlyph />{t("glissandoFile.dropToOpen")}</span>
</div>

<style>
  .layer {
    position: absolute;
    inset: 12px;
    z-index: 4;
    display: grid;
    place-items: center;
    border: 2px dashed var(--gl-accent);
    border-radius: var(--gl-radius-large);
    background: color-mix(in srgb, var(--gl-accent) 10%, var(--gl-ground));
    font-weight: var(--gl-weight-semibold);
    text-align: center;
    pointer-events: none;
  }
  span {
    display: grid;
    justify-items: center;
    gap: 8px;
  }
</style>
