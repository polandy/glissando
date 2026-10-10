<script lang="ts">
  import type { Snippet } from "svelte";
  import { getTranslator } from "../i18n/context";
  import Icon from "./Icon.svelte";

  /**
   * Lemon for a warning, coral for an error, mint for what is done as asked; it stays where its
   * cause is (dev-docs/APP.md).
   * `actions` are buttons below the text; `onDismiss` adds a ✕.
   */
  let {
    tone,
    children,
    actions,
    onDismiss,
  }: {
    tone: "warn" | "error" | "mint";
    children: Snippet;
    actions?: Snippet | undefined;
    onDismiss?: (() => void) | undefined;
  } = $props();

  const { t } = getTranslator();
</script>

<div class="notice {tone}" role={tone === "error" ? "alert" : "status"}>
  <span class="icon"><Icon name={tone === "error" ? "alert" : "info"} /></span>
  <div class="body">
    <div class="text">{@render children()}</div>
    {#if actions}
      <div class="actions">{@render actions()}</div>
    {/if}
  </div>
  {#if onDismiss}
    <button
      class="icon-btn dismiss"
      type="button"
      title={t("common.dismiss")}
      aria-label={t("common.dismiss")}
      onclick={onDismiss}
    >
      <Icon name="close" />
    </button>
  {/if}
</div>

<style>
  .notice {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 11px 14px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
    background: var(--gl-surface);
    color: var(--gl-ink);
    font-size: var(--gl-size-body);
    line-height: 1.45;
  }
  .warn {
    border-color: color-mix(in srgb, var(--gl-lemon) 55%, var(--gl-line));
    background: color-mix(in srgb, var(--gl-lemon) 14%, var(--gl-surface));
  }
  .error {
    border-color: color-mix(in srgb, var(--gl-coral) 55%, var(--gl-line));
    background: color-mix(in srgb, var(--gl-coral) 14%, var(--gl-surface));
  }
  .mint {
    border-color: color-mix(in srgb, var(--gl-mint) 55%, var(--gl-line));
    background: color-mix(in srgb, var(--gl-mint) 14%, var(--gl-surface));
  }
  .icon {
    flex: none;
    display: flex;
    margin-top: 1px;
  }
  .warn .icon {
    color: var(--gl-warn-icon);
  }
  .error .icon {
    color: var(--gl-coral);
  }
  .body {
    flex: 1;
    display: grid;
    gap: 10px;
    min-width: 0;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .dismiss {
    flex: none;
    margin: -6px -8px -6px 0;
  }
  /* A way out inside the text reads as a link. */
  .text :global(button) {
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    font-weight: var(--gl-weight-semibold);
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
  }
</style>
