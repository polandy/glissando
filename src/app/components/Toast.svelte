<script lang="ts">
  import { getTranslator } from "../i18n/context";
  import { ICONS } from "../icons";
  import type { ToastMessage } from "../toast/toaster";

  /** Renders the `Toaster`'s current toast; the toaster owns its timing. */
  let {
    toast,
    onAction,
    onDismiss,
  }: { toast: ToastMessage; onAction: () => void; onDismiss: () => void } = $props();

  const { t } = getTranslator();
</script>

<div class="toast {toast.tone}" role={toast.tone === "error" ? "alert" : "status"}>
  <span>{toast.text}</span>
  {#if toast.action}
    <button class="action" type="button" onclick={onAction}>{toast.action.label}</button>
  {/if}
  <button class="close" type="button" aria-label={t("common.dismiss")} onclick={onDismiss}>
    {ICONS.close}
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
    gap: 12px;
    padding: 12px 16px;
    border-radius: 16px;
    background: var(--gl-inverse-bg);
    color: var(--gl-inverse-text);
    box-shadow: var(--gl-shadow);
    font-size: var(--gl-size-body);
    animation: rise 0.2s ease-out;
  }
  .toast.error {
    background: var(--gl-coral);
    color: var(--gl-on-accent);
  }
  .action {
    margin-left: auto;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    font-weight: var(--gl-weight-heading);
    text-decoration: underline;
    text-underline-offset: 3px;
    white-space: nowrap;
    cursor: pointer;
  }
  .close {
    padding: 0 2px;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: var(--gl-size-title);
    cursor: pointer;
  }
  .toast:not(:has(.action)) .close {
    margin-left: auto;
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
