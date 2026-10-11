<script lang="ts">
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import type { MusicChoice } from "./import-session";
  import { convertibleSourceLabel } from "./import-view";

  /** The picked music while its FLAC copy is made (ADR-0020). */
  let {
    music,
    onCancel,
  }: {
    music: Extract<MusicChoice, { kind: "converting" }>;
    onCancel: () => void;
  } = $props();

  const PERCENT = 100;
  const { t } = getTranslator();
  const format = $derived(convertibleSourceLabel(music.source));
  const percent = $derived(Math.floor(music.progress * PERCENT));
</script>

<div class="panel">
  <div class="track">
    <span class="art"><Icon name="music" /></span>
    <div class="text">
      <b>{music.pickedName}</b>
      <span class="muted mono meta">{t("import.musicConverting", { format })}</span>
    </div>
    <button
      class="icon-btn"
      type="button"
      title={t("import.cancelConversion")}
      aria-label={t("import.cancelConversion")}
      onclick={onCancel}
    >
      <Icon name="close" />
    </button>
  </div>
  <div class="convert">
    <div
      class="progress"
      role="progressbar"
      aria-label={t("import.convertingToFlac")}
      aria-valuemin="0"
      aria-valuemax={PERCENT}
      aria-valuenow={percent}
    >
      <i style:width="{percent}%"></i>
    </div>
    <div class="line mono">
      <span>{t("import.convertingToFlac")}</span>
      <span>{t("import.convertPercent", { percent })}</span>
    </div>
    <p class="why">{t("import.convertingWhy", { format })}</p>
  </div>
</div>

<style>
  .panel {
    display: grid;
    gap: 14px;
    padding: 16px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
  }
  .track {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .text {
    flex: 1;
    min-width: 0;
  }
  .text b {
    display: block;
    overflow: hidden;
    font-weight: var(--gl-weight-semibold);
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .meta {
    font-size: var(--gl-size-meta);
  }
  .art {
    display: grid;
    place-items: center;
    flex: none;
    width: 44px;
    height: 44px;
    border-radius: var(--gl-radius);
    background: linear-gradient(135deg, var(--gl-lemon), var(--gl-logo-peach));
    color: var(--gl-art-ink);
  }
  .convert {
    display: grid;
    gap: 6px;
  }
  .progress {
    height: 6px;
    overflow: hidden;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-hover);
  }
  .progress i {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--gl-accent);
  }
  .line {
    display: flex;
    justify-content: space-between;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
  .why {
    margin: 4px 0 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
    line-height: 1.45;
  }
</style>
