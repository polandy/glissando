<script lang="ts">
  import { getTranslator } from "../i18n/context";
  import { focusLineText, type FocusLineView } from "./focus-indication";

  /** One quiet line under the picture: its focus search's state, and an action to look again. */
  let { line, onLookAgain }: { line: FocusLineView; onLookAgain: () => void } = $props();

  const { t } = getTranslator();

  const text = $derived(focusLineText(line));
</script>

<p class="focus-line">
  {#if text.pending}
    <span class="searching" role="status"><i class="dot"></i>{t(text.textKey)}</span>
  {:else}
    <span class="msg">{t(text.textKey)}</span>
  {/if}
  {#if text.actionKey !== null}
    <button type="button" class="action" onclick={onLookAgain}>{t(text.actionKey)}</button>
  {/if}
</p>

<style>
  .focus-line {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    min-height: 18px;
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
    line-height: 1.45;
    text-align: center;
  }
  .searching {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 3px 10px;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-hover);
    font-weight: var(--gl-weight-medium);
  }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--gl-mint);
    animation: pulse 1.6s ease-in-out infinite;
  }
  @keyframes pulse {
    50% {
      opacity: 0.3;
    }
  }
  .action {
    padding: 0;
    border: none;
    background: none;
    color: var(--gl-accent);
    font: inherit;
    font-weight: var(--gl-weight-medium);
    text-decoration: underline;
    cursor: pointer;
  }
  @container (max-width: 720px) {
    .focus-line {
      padding: 0 16px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .dot {
      animation: none;
    }
  }
</style>
