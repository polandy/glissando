<script lang="ts">
  import type { Snippet } from "svelte";
  import { getTranslator } from "../i18n/context";
  import Icon from "./Icon.svelte";
  import LogoMark from "./LogoMark.svelte";

  let {
    crumbs,
    onBack,
    actions,
  }: {
    /** From the root; the last one is the current place. None on the start screen: the brand. */
    crumbs: readonly string[];
    /** Shows the back arrow; it should go back through history (see dev-docs/APP.md). */
    onBack?: () => void;
    /** The screen's own buttons, at the right end of the bar. */
    actions?: Snippet | undefined;
  } = $props();

  const { t } = getTranslator();
</script>

<header class="bar">
  {#if onBack}
    <button
      class="icon-btn"
      type="button"
      title={t("common.back")}
      aria-label={t("common.back")}
      onclick={onBack}
    >
      <Icon name="back" />
    </button>
  {/if}
  <nav class="crumbs" aria-label={t("common.breadcrumb")}>
    {#if crumbs.length === 0}
      <span class="brand"><LogoMark />{t("app.name")}</span>
    {/if}
    {#each crumbs as crumb, index (index)}
      {#if index < crumbs.length - 1}
        <span class="earlier">{crumb}</span>
        <span class="earlier separator" aria-hidden="true">/</span>
      {:else}
        <span class="here" aria-current="page">{crumb}</span>
      {/if}
    {/each}
  </nav>
  {#if actions}
    <div class="actions">{@render actions()}</div>
  {/if}
</header>

<style>
  .bar {
    flex: none;
    display: flex;
    align-items: center;
    gap: 12px;
    height: 56px;
    padding: 0 18px;
    border-bottom: 1px solid var(--gl-line);
    background: var(--gl-surface);
  }
  .crumbs {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    color: var(--gl-muted);
    font-weight: var(--gl-weight-medium);
  }
  .earlier {
    flex: none;
    white-space: nowrap;
  }
  .separator {
    color: var(--gl-faint);
  }
  .here {
    overflow: hidden;
    color: var(--gl-ink);
    font-weight: var(--gl-weight-semibold);
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 9px;
    color: var(--gl-ink);
    font-family: var(--gl-font-wordmark);
    font-weight: var(--gl-weight-wordmark);
    font-size: var(--gl-size-wordmark);
  }
  .actions {
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  @container (max-width: 720px) {
    .bar {
      padding: 0 12px;
    }
    .earlier {
      display: none;
    }
  }
</style>
