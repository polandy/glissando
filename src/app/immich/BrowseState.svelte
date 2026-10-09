<script lang="ts">
  import type { Snippet } from "svelte";
  import Icon from "../components/Icon.svelte";
  import type { IconName } from "../icons";

  /** A whole-view message in the Immich browser: failing, empty, nothing matching. */
  let {
    icon,
    title,
    text,
    action,
  }: { icon: IconName; title: string; text: string; action?: Snippet | undefined } = $props();
</script>

<div class="state">
  <Icon name={icon} />
  <b>{title}</b>
  <span>{text}</span>
  {#if action}{@render action()}{/if}
</div>

<style>
  .state {
    --gl-icon-size: var(--gl-size-icon-large);
    display: grid;
    justify-items: center;
    gap: 12px;
    padding: 60px 20px;
    color: var(--gl-muted);
    text-align: center;
  }
  b {
    color: var(--gl-ink);
    font-size: var(--gl-size-title);
  }
</style>
