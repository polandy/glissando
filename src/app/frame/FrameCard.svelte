<script lang="ts">
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";

  /** The start screen's entry into the picture frame (`dev-docs/app/FRAME.md`). */
  let { onSetUp }: { onSetUp: () => void } = $props();

  const { t } = getTranslator();
</script>

<div class="frame-card">
  <span class="frame-ico"><Icon name="frame" /></span>
  <div class="frame-body">
    <b>{t("frame.cardTitle")}</b>
    <p>{t("frame.cardText")}</p>
  </div>
  <button class="btn" type="button" onclick={onSetUp}>{t("frame.setUp")}</button>
</div>

<style>
  .frame-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
    box-shadow: var(--gl-shadow);
  }
  .frame-ico {
    flex: none;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: var(--gl-radius);
    background: color-mix(in srgb, var(--gl-accent) 16%, var(--gl-surface));
    color: var(--gl-accent);
    --gl-icon-size: var(--gl-size-icon);
  }
  .frame-body {
    flex: 1;
    min-width: 0;
  }
  .frame-body p {
    margin: 2px 0 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
</style>
