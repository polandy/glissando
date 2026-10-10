<script lang="ts">
  import type { IconName } from "../../ui-kit/icons";
  import Icon from "./Icon.svelte";

  /** A panel section's eyebrow title and its state chip, accent-tinted when the user's own. */
  let {
    id,
    title,
    stateText,
    own,
    icon,
  }: { id: string; title: string; stateText: string; own: boolean; icon?: IconName } = $props();
</script>

<div class="row">
  <h2 class="eyebrow" {id}>
    {#if icon}<Icon name={icon} />{/if}{title}
  </h2>
  <span class="state" class:own>{stateText}</span>
</div>

<style>
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
  }
  .state {
    padding: 3px 9px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-pill);
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
    font-weight: var(--gl-weight-semibold);
    white-space: nowrap;
  }
  .state.own {
    border-color: transparent;
    background: color-mix(in srgb, var(--gl-accent) 28%, var(--gl-surface));
    color: var(--gl-ink);
  }
</style>
