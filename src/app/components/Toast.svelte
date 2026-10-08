<script lang="ts">
  import { getTranslator } from "../i18n/context";
  import type { ToastMessage } from "../toast/toaster";
  import Icon from "./Icon.svelte";

  /** Renders the `Toaster`'s current toast; the toaster owns its timing. */
  let {
    toast,
    onAction,
    onDismiss,
  }: { toast: ToastMessage; onAction: () => void; onDismiss: () => void } = $props();

  const { t } = getTranslator();
</script>

<div class="toast {toast.tone}" role={toast.tone === "error" ? "alert" : "status"}>
  {#if toast.tone === "error"}
    <span class="icon"><Icon name="alert" /></span>
  {/if}
  <span class="text">{toast.text}</span>
  {#if toast.action}
    <button class="btn ghost action" type="button" onclick={onAction}>{toast.action.label}</button>
  {/if}
  <button class="icon-btn close" type="button" aria-label={t("common.dismiss")} onclick={onDismiss}>
    <Icon name="close" />
  </button>
</div>

<style>
  .toast {
    position: fixed;
    left: 12px;
    right: 12px;
    /* Raised above a bottom action bar while one is shown; see toast-clearance.ts. */
    bottom: calc(16px + var(--gl-toast-clearance, 0px));
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 8px 8px 16px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
    color: var(--gl-ink);
    box-shadow: var(--gl-shadow);
    font-size: var(--gl-size-body);
    line-height: 1.4;
    animation: rise 0.2s ease-out;
  }
  .toast.error {
    border-color: color-mix(in srgb, var(--gl-coral) 55%, var(--gl-line));
    background: color-mix(in srgb, var(--gl-coral) 14%, var(--gl-surface));
  }
  .icon {
    flex: none;
    display: flex;
    color: var(--gl-coral);
  }
  .text {
    flex: 1;
    min-width: 0;
  }
  .action {
    color: var(--gl-ink);
  }
  @media (min-width: 700px) {
    .toast {
      left: auto;
      right: 20px;
      bottom: calc(20px + var(--gl-toast-clearance, 0px));
      max-width: 440px;
    }
  }
  @keyframes rise {
    from {
      transform: translateY(16px);
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .toast {
      animation: none;
    }
  }
</style>
