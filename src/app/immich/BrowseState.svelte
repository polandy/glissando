<script lang="ts">
  import type { Snippet } from "svelte";
  import Icon from "../components/Icon.svelte";
  import type { IconName } from "../../ui-kit/icons";

  /** A whole-view message in the Immich browser: loading, failing, empty, nothing matching. */
  let {
    icon,
    title,
    text,
    action,
  }: {
    icon: IconName;
    title: string;
    text?: string | undefined;
    action?: Snippet | undefined;
  } = $props();
</script>

<div class="state">
  <Icon name={icon} />
  <b>{title}</b>
  {#if text !== undefined}<span>{text}</span>{/if}
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
