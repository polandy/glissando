<script lang="ts" module>
  /** Non-blocking background work: the header's ring with a label and the 3 px bar below. */
  export interface BackgroundActivity {
    readonly label: string;
    /** 0..1; absent while the amount is unknown. */
    readonly progress?: number;
  }
</script>

<script lang="ts">
  import { getTranslator } from "../i18n/context";
  import { ICONS } from "../icons";

  let {
    crumbs,
    onBack,
    activity = null,
  }: {
    /** From the root; the last one is the current place, shown bold and ellipsised. */
    crumbs: readonly string[];
    /** Shows the back arrow; it should go back through history (see dev-docs/APP.md). */
    onBack?: () => void;
    activity?: BackgroundActivity | null;
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
  {#if activity}
    <div class="activity" role="status">
      <span class="ring" aria-hidden="true"></span>
      <span>{activity.label}</span>
    </div>
  {/if}
</header>
<div class="bar">
  {#if activity}
    {#if activity.progress === undefined}
      <i class="indeterminate"></i>
    {:else}
      <i style:transform="scaleX({activity.progress})"></i>
    {/if}
  {/if}
</div>

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
  .activity {
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--gl-size-small);
    color: var(--gl-muted);
  }
  .bar {
    position: relative;
    height: 3px;
    overflow: hidden;
    background: var(--gl-line);
  }
  .bar i {
    position: absolute;
    inset: 0;
    background: var(--gl-mint);
    transform-origin: left;
    transition: transform 0.25s;
  }
  .bar i.indeterminate {
    width: 30%;
    animation: travel 1.2s ease-in-out infinite;
  }
  @keyframes travel {
    from {
      left: -30%;
    }
    to {
      left: 100%;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .bar i {
      transition: none;
    }
    .bar i.indeterminate {
      animation-duration: 3s;
    }
  }
</style>
