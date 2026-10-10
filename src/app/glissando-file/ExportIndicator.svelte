<script lang="ts">
  import { getTranslator } from "../i18n/context";
  import type { ExportProgress } from "./export-job";

  /**
   * The background export's, or a server slideshow's copy's, place in the header: a progress
   * ring, its label and a line below.
   */
  let { progress }: { progress: ExportProgress } = $props();

  const PERCENT = 100;
  const { t } = getTranslator();
  const percent = $derived(Math.round(progress.fraction * PERCENT));
</script>

<div class="indicator" role="status">
  <svg class="progress-ring" viewBox="0 0 20 20" aria-hidden="true">
    <circle class="track" cx="10" cy="10" r="7.5" pathLength={PERCENT} />
    <circle
      class="done"
      cx="10"
      cy="10"
      r="7.5"
      pathLength={PERCENT}
      stroke-dasharray="{progress.fraction * PERCENT} {PERCENT}"
    />
  </svg>
  <span class="label">
    {t(progress.copying ? "server.copying" : "glissandoFile.exportIndicator", {
      title: progress.title,
      percent,
    })}
  </span>
</div>
<span class="line" style:width="{progress.fraction * PERCENT}%" aria-hidden="true"></span>

<style>
  .indicator {
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
    font-weight: var(--gl-weight-medium);
    white-space: nowrap;
  }
  .progress-ring {
    flex: none;
    width: 18px;
    height: 18px;
    /* The arc starts at twelve o'clock. */
    transform: rotate(-90deg);
    fill: none;
    stroke-width: 3;
  }
  .track {
    stroke: var(--gl-line);
  }
  .done {
    stroke: var(--gl-mint);
  }
  .line {
    position: absolute;
    left: 0;
    bottom: -1px;
    height: 3px;
    background: var(--gl-mint);
    transition: width 0.3s;
  }
  @media (prefers-reduced-motion: reduce) {
    .line {
      transition: none;
    }
  }
  @container (max-width: 720px) {
    .label {
      display: none;
    }
  }
</style>
