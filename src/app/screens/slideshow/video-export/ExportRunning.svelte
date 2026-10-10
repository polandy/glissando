<script lang="ts">
  import { MILLISECONDS_PER_SECOND } from "../../../../player";
  import { FRAMES_PER_SECOND } from "../../../../video-export";
  import { getTranslator } from "../../../i18n/context";
  import type { ExportPreview } from "../../../video-export/slideshow-video-export";
  import type { ExportSheetState } from "../../../video-export/export-sheet-state";

  /** The frame just encoded, the progress and the time left; only "Cancel". */
  let {
    view,
    durationSeconds,
    onCancel,
  }: {
    view: Extract<ExportSheetState, { readonly kind: "running" }>;
    durationSeconds: number;
    onCancel: () => void;
  } = $props();

  /** Draws a frame into the preview; the sheet hands it to the session. */
  export function showPreview(frame: ExportPreview): void {
    const context = preview.getContext("2d");
    context?.drawImage(frame, 0, 0, preview.width, preview.height);
  }

  const { t, formatDuration } = getTranslator();
  const PERCENT = 100;
  /** The preview's drawing size: sharp at the sheet's width on a 2× screen. */
  const PREVIEW_WIDTH = 960;
  const PREVIEW_HEIGHT = 540;

  let preview: HTMLCanvasElement;
  const fraction = $derived(view.framesTotal === 0 ? 0 : view.framesDone / view.framesTotal);
  const atSeconds = $derived(Math.min(durationSeconds, view.framesDone / FRAMES_PER_SECOND));
</script>

<div class="preview">
  <canvas bind:this={preview} width={PREVIEW_WIDTH} height={PREVIEW_HEIGHT}></canvas>
  <span class="stamp mono">
    {t("videoExport.position", {
      at: formatDuration(atSeconds),
      total: formatDuration(durationSeconds),
    })}
  </span>
</div>
<div
  class="meter"
  role="progressbar"
  aria-valuemin="0"
  aria-valuemax={PERCENT}
  aria-valuenow={Math.round(fraction * PERCENT)}
>
  <i style:width="{fraction * PERCENT}%"></i>
</div>
<div class="row">
  <span>{t("videoExport.frames", { done: view.framesDone, total: view.framesTotal })}</span>
  {#if view.remainingMs !== null}
    <span>
      {t("videoExport.remaining", {
        time: formatDuration(view.remainingMs / MILLISECONDS_PER_SECOND),
      })}
    </span>
  {/if}
</div>
<p class="hint">{t("videoExport.runningHint")}</p>
<footer>
  <button class="btn" type="button" onclick={onCancel}>{t("common.cancel")}</button>
</footer>

<style>
  .preview {
    position: relative;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border-radius: var(--gl-radius);
    background: var(--gl-player-bg);
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
  .stamp {
    position: absolute;
    right: 8px;
    bottom: 8px;
    padding: 3px 7px;
    border-radius: var(--gl-radius-small);
    background: var(--gl-photo-badge);
    color: var(--gl-on-photo);
    font-size: var(--gl-size-small);
  }
  .meter {
    height: 8px;
    overflow: hidden;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-hover);
  }
  .meter i {
    display: block;
    height: 100%;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-mint);
  }
  .row {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    color: var(--gl-muted);
    font-size: var(--gl-size-label);
    font-variant-numeric: tabular-nums;
  }
</style>
