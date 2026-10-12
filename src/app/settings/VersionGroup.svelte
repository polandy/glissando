<script lang="ts">
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import type { BuildInfo } from "./build-info";

  /** The running build, and the way to the waiting one (dev-docs/app/SETTINGS.md). */
  let {
    build,
    updateWaiting,
    onUpdate,
  }: { build: BuildInfo; updateWaiting: boolean; onUpdate: () => void } = $props();

  const { t, formatDate } = getTranslator();
</script>

<section class="group" aria-labelledby="settings-version">
  <div class="eyebrow" id="settings-version">{t("settings.version")}</div>
  <div class="box" class:update={updateWaiting}>
    <div class="text">
      <b>{t("settings.versionName", { version: build.version })}</b>
      <span>{build.commit} · {formatDate(build.commitDate)}</span>
    </div>
    {#if updateWaiting}
      <button class="btn primary small" type="button" onclick={onUpdate}>
        <Icon name="refresh" />{t("settings.update")}
      </button>
    {/if}
  </div>
</section>

<style>
  .group {
    display: grid;
    gap: 8px;
  }
  .box {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
  }
  .box.update {
    border-color: var(--gl-accent-line);
    background: var(--gl-accent-tint);
  }
  .text {
    flex: 1;
    min-width: 150px;
    display: grid;
    gap: 2px;
  }
  b {
    font-weight: var(--gl-weight-semibold);
  }
  span {
    font-family: var(--gl-font-mono);
    font-size: var(--gl-size-small);
    color: var(--gl-muted);
  }
</style>
