<script lang="ts">
  import type { Snippet } from "svelte";
  import Icon from "./Icon.svelte";

  /** Lemon for a warning, coral for an error; it stays where its cause is (dev-docs/APP.md). */
  let { tone, children }: { tone: "warn" | "error"; children: Snippet } = $props();
</script>

<div class="notice {tone}" role={tone === "error" ? "alert" : "status"}>
  <span class="icon"><Icon name={tone === "error" ? "alert" : "info"} /></span>
  <div>{@render children()}</div>
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
  /* A way out inside the notice reads as a link. */
  .notice :global(button) {
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
