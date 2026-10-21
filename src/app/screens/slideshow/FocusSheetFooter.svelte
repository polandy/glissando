<script lang="ts">
  import { getTranslator } from "../../i18n/context";
  import type { FocusSheetStatus } from "./focus-sheet-view";

  /** "Try again"/"Look again at all" and the own-motion hint (ADR-0041). */
  let {
    status,
    total,
    ownMotionCount,
    failedPictureIds,
    allPictureIds,
    onLookAgain,
  }: {
    status: FocusSheetStatus;
    total: number;
    ownMotionCount: number;
    failedPictureIds: readonly string[];
    allPictureIds: readonly string[];
    onLookAgain: (pictureIds: readonly string[]) => void;
  } = $props();

  const { t } = getTranslator();

  const busy = $derived(status.kind === "looking");
  const disabled = $derived(busy || status.kind === "waitingForServer");
</script>

<div class="sfoot">
  {#if status.kind === "failed"}
    <button class="btn primary" type="button" onclick={() => onLookAgain(failedPictureIds)}>
      {t("focusSheet.tryAgain", { count: failedPictureIds.length })}
    </button>
  {/if}
  <button
    class="btn"
    type="button"
    aria-disabled={disabled}
    onclick={() => {
      if (!disabled) onLookAgain(allPictureIds);
    }}
  >
    {busy ? t("focusSheet.lookingEllipsis") : t("focusSheet.lookAgainAll", { count: total })}
  </button>
  {#if ownMotionCount > 0}
    <p class="hint">{t("focusSheet.ownMotionHint", { count: ownMotionCount })}</p>
  {/if}
</div>

<style>
  .sfoot {
    display: grid;
    gap: 8px;
    padding: 12px 16px 16px;
    border-top: 1px solid var(--gl-line);
  }
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px 14px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
    background: var(--gl-surface);
    color: var(--gl-ink);
    font: inherit;
    font-weight: var(--gl-weight-medium);
    cursor: pointer;
  }
  .btn.primary {
    border-color: var(--gl-accent);
    background: var(--gl-accent);
    color: var(--gl-accent-ink);
  }
  .btn[aria-disabled="true"] {
    opacity: 0.5;
    cursor: default;
  }
  .hint {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
</style>
