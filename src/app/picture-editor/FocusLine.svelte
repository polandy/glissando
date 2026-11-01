<script lang="ts">
  import { getTranslator } from "../i18n/context";
  import { focusLineText, type FocusLineView } from "./focus-indication";

  /** One quiet line below the motion controls: its focus search's state, and an action to look again. */
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
    <button type="button" class="btn small ghost action" onclick={onLookAgain}
      >{t(text.actionKey)}</button
    >
  {/if}
</p>

<style>
  .focus-line {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    min-height: 18px;
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
    line-height: 1.45;
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
  @media (prefers-reduced-motion: reduce) {
    .dot {
      animation: none;
    }
  }
</style>
