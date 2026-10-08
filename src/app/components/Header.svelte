<script lang="ts">
  import { getTranslator } from "../i18n/context";
  import { ICONS } from "../icons";

  let {
    crumbs,
    onBack,
  }: {
    /** From the root; the last one is the current place, shown bold and ellipsised. */
    crumbs: readonly string[];
    /** Shows the back arrow; it should go back through history (see dev-docs/APP.md). */
    onBack?: () => void;
  } = $props();

  const { t } = getTranslator();
</script>

<header class="header">
  {#if onBack}
    <button
      class="back"
      type="button"
      title={t("common.back")}
      aria-label={t("common.back")}
      onclick={onBack}
    >
      {ICONS.back}
    </button>
  {/if}
  <nav class="crumbs" aria-label={t("common.breadcrumb")}>
    {#each crumbs as crumb, index (index)}
      {#if index < crumbs.length - 1}
        <span>{crumb}</span><span class="separator" aria-hidden="true">{ICONS.crumbSeparator}</span>
      {:else}
        <span class="here" aria-current="page">{crumb}</span>
      {/if}
    {/each}
  </nav>
</header>
<div class="bar"></div>

<style>
  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 56px;
    padding: 10px 14px;
  }
  .back {
    flex: none;
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: var(--gl-size-icon);
    cursor: pointer;
  }
  .back:hover {
    background: var(--gl-line);
  }
  .crumbs {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-size: var(--gl-size-body);
  }
  .crumbs span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .separator {
    flex: none;
    opacity: 0.4;
  }
  .here {
    font-weight: var(--gl-weight-heading);
  }
  .bar {
    height: 3px;
    background: var(--gl-line);
  }
</style>
