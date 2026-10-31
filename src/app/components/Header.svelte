<script lang="ts">
  import type { Snippet } from "svelte";
  import ExportIndicator from "../glissando-file/ExportIndicator.svelte";
  import { getExportStatus } from "../glissando-file/export-status";
  import { getFocusSearchStatus } from "../focus-search-status";
  import { getTranslator } from "../i18n/context";
  import { getNavigator } from "../navigation/context";
  import { crumbLabel, crumbTarget, isCrumbLink, type Crumb } from "./crumbs";
  import FocusSearchIndicator from "./FocusSearchIndicator.svelte";
  import Icon from "./Icon.svelte";
  import LogoMark from "./LogoMark.svelte";

  let {
    crumbs,
    onBack,
    backDisabled = false,
    actions,
  }: {
    /**
     * From the root; the last one is the current place, those before it link to their screens
     * (see `Crumb`). None on the start screen: the brand.
     */
    crumbs: readonly Crumb[];
    /** Shows the back arrow; it should go back through history (see dev-docs/app/NAVIGATION.md). */
    onBack?: () => void;
    /** Greys the back arrow out while leaving would interrupt something under way. */
    backDisabled?: boolean;
    /** The screen's own buttons, at the right end of the bar. */
    actions?: Snippet | undefined;
  } = $props();

  const { t } = getTranslator();
  const navigator = getNavigator();
  const exportStatus = getExportStatus();
  const focusSearchStatus = getFocusSearchStatus();
</script>

<header class="bar">
  {#if onBack}
    <button
      class="icon-btn"
      type="button"
      title={t("common.back")}
      aria-label={t("common.back")}
      disabled={backDisabled}
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
        {#if isCrumbLink(crumbs, index)}
          <button
            class={["crumb-link", index === 0 && "root"]}
            type="button"
            onclick={() => navigator.backTo(crumbTarget(crumbs, index, navigator.route))}
          >
            {crumbLabel(crumb)}
          </button>
        {:else}
          <span class="earlier">{crumbLabel(crumb)}</span>
        {/if}
        <span class={["separator", index > 0 && "earlier"]} aria-hidden="true">/</span>
      {:else}
        <span class="here" aria-current="page">{crumbLabel(crumb)}</span>
      {/if}
    {/each}
  </nav>
  {#if exportStatus?.current}
    <ExportIndicator progress={exportStatus.current} />
  {/if}
  {#if focusSearchStatus?.current}
    <FocusSearchIndicator
      search={focusSearchStatus.current}
      besideExport={exportStatus?.current != null}
    />
  {/if}
  {#if actions}
    <div class="actions">{@render actions()}</div>
  {/if}
</header>

<style>
  .bar {
    position: relative;
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
  .crumb-link {
    flex: none;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    white-space: nowrap;
    cursor: pointer;
    /* Always underlined, faintly: touch has no hover to reveal the link. */
    text-decoration: underline;
    text-decoration-color: var(--gl-faint);
    text-underline-offset: 3px;
  }
  .crumb-link:hover {
    color: var(--gl-ink);
    text-decoration-color: currentColor;
  }
  @media (pointer: coarse) {
    .crumb-link {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
    }
  }
  .separator {
    flex: none;
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
    .earlier,
    .crumb-link:not(.root) {
      display: none;
    }
  }
</style>
