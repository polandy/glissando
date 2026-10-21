<script lang="ts">
  import type { FocusSlideshowSummary } from "../../focus/pictures-focus";
  import Icon from "../../components/Icon.svelte";
  import { getTranslator } from "../../i18n/context";
  import { focusSheetStatus } from "./focus-sheet-view";

  /** The Focus sheet's status line: progress while looking, otherwise what is left to know (ADR-0041). */
  let {
    summary,
    passPaused,
  }: {
    summary: FocusSlideshowSummary;
    passPaused: boolean;
  } = $props();

  const { t } = getTranslator();
  const PERCENT = 100;

  const status = $derived(focusSheetStatus(summary, passPaused));
</script>

<div class="status">
  {#if status.kind === "looking"}
    <span
      >{t(status.again ? "focusSheet.lookingAgain" : "focusSheet.looking", {
        done: status.done,
        total: status.total,
      })}</span
    >
    <div class="bar"><i style:width="{(status.done / status.total) * PERCENT}%"></i></div>
    {#if status.again}
      <p class="hint">{t("focusSheet.lookingAgainHint")}</p>
    {/if}
  {:else if status.kind === "waitingForServer"}
    <b>{t("focusSheet.lookedAtSoFar", { done: status.done, total: status.total })}</b>
    <p class="hint cloud">
      <Icon name="cloudOff" />{t("focusSheet.waitingForServerHint", {
        count: status.total - status.done,
      })}
    </p>
  {:else if status.kind === "failed"}
    <b>{t("focusSheet.lookedAtSoFar", { done: status.done, total: status.total })}</b>
    <p class="hint">{t("focusSheet.failedHint", { count: status.failedCount })}</p>
  {:else}
    <b>{t("focusSheet.allLookedAt")}</b>
  {/if}
</div>

<style>
  .status {
    display: grid;
    gap: 6px;
    font-size: var(--gl-size-title);
  }
  .bar {
    height: 4px;
    border-radius: var(--gl-radius-tiny);
    background: var(--gl-hover);
    overflow: hidden;
  }
  .bar i {
    display: block;
    height: 100%;
    background: var(--gl-mint);
  }
  .hint {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
  .hint.cloud {
    display: flex;
    align-items: center;
    gap: 6px;
  }
</style>
