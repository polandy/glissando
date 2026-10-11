<script lang="ts">
  import { getTranslator } from "../i18n/context";
  import type { MusicChoice } from "./import-session";
  import { convertibleSourceLabel } from "./import-view";
  import TrackHead from "./TrackHead.svelte";

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
  <TrackHead
    name={music.pickedName}
    meta={t("import.musicConverting", { format })}
    closeLabel={t("import.cancelConversion")}
    onClose={onCancel}
  />
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
