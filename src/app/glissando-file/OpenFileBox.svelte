<script lang="ts">
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import FileGlyph from "./FileGlyph.svelte";

  /** Step 1's way to a slideshow exported on another device. */
  let { onPick }: { onPick: () => void } = $props();

  const { t } = getTranslator();
</script>

<div class="box">
  <FileGlyph />
  <div class="text">
    <b>{t("glissandoFile.fromOtherDevice")}</b>
    <span>{t("glissandoFile.fromOtherDeviceText")}</span>
  </div>
  <button class="btn" type="button" onclick={onPick}>
    <Icon name="open" />{t("glissandoFile.openFile")}
  </button>
</div>

<style>
  .box {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-raised);
  }
  .text {
    flex: 1;
    display: grid;
    gap: 2px;
    min-width: 180px;
    font-size: var(--gl-size-body);
  }
  .text b {
    font-weight: var(--gl-weight-semibold);
  }
  .text span {
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
</style>
