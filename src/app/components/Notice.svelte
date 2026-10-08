<script lang="ts">
  import type { Snippet } from "svelte";
  import { ICONS } from "../icons";

  /** Lemon for a warning, coral for an error; it stays where its cause is (dev-docs/APP.md). */
  let { tone, children }: { tone: "warn" | "error"; children: Snippet } = $props();
</script>

<div class="notice {tone}" role={tone === "error" ? "alert" : "status"}>
  <span class="icon" aria-hidden="true">{tone === "error" ? ICONS.warning : ICONS.info}</span>
  <div>{@render children()}</div>
</div>

<style>
  .notice {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-top: 12px;
    padding: 10px 14px;
    border-radius: var(--gl-radius-tile);
    font-size: var(--gl-size-body);
    line-height: 1.35;
    color: var(--gl-text);
  }
  .warn {
    background: color-mix(in srgb, var(--gl-lemon) 40%, var(--gl-surface));
  }
  .error {
    background: color-mix(in srgb, var(--gl-coral) 45%, var(--gl-surface));
  }
  .icon {
    flex: none;
    font-size: var(--gl-size-title);
  }
  /* A way out inside the notice reads as a link. */
  .notice :global(button) {
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
  }
</style>
