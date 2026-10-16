<script lang="ts">
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import type { DemoSlideshowState } from "./demo-slideshow-flow";

  /** The start screen's demo card, above "New slideshow" on an empty, public install. */
  let { state, onLoad }: { state: DemoSlideshowState; onLoad: () => void } = $props();

  /** The demo download's own bytes-per-megabyte, rounded like `Translator.formatBytes`. */
  const BYTES_PER_MEGABYTE = 1_000_000;

  const { t } = getTranslator();

  /** The action text, loading or idle; doubles as the card's accessible name. */
  const actionText = $derived.by(() => {
    if (state.kind !== "loading") return t("start.loadDemo");
    return state.total === null
      ? t("start.loadingDemo")
      : t("start.loadingDemoProgress", {
          received: megabytes(state.received),
          total: megabytes(state.total),
        });
  });
  const disabled = $derived(state.kind === "loading" || !state.online);
  const idleOnline = $derived(state.kind !== "loading" && state.online);

  /** Rounded like `Translator.formatBytes`, without its gigabyte fallback the demo never reaches. */
  function megabytes(bytes: number): number {
    return bytes > 0 ? Math.max(1, Math.round(bytes / BYTES_PER_MEGABYTE)) : 0;
  }
</script>

<button class="demo-card" type="button" aria-label={actionText} {disabled} onclick={onLoad}>
  <span class="cover" aria-hidden="true"><Icon name="play" /></span>
  <span class="body">
    <span class="heading">{t("start.demoCardTitle")}</span>
    <span class="line" class:action={idleOnline}>
      {#if state.kind === "loading"}
        {actionText}
      {:else if !state.online}
        {t("start.demoNeedsConnection")}
      {:else}
        {actionText}<span class="arrow" aria-hidden="true">→</span>
      {/if}
    </span>
  </span>
  {#if state.kind === "loading"}
    <span class="meter" aria-hidden="true">
      <i
        class:indeterminate={state.total === null}
        style:width={state.total === null ? undefined : `${(state.received / state.total) * 100}%`}
      ></i>
    </span>
  {/if}
</button>

<style>
  .demo-card {
    position: relative;
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 14px 16px;
    overflow: hidden;
    border: none;
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
    box-shadow: var(--gl-shadow);
    color: var(--gl-ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .demo-card:hover:not(:disabled) {
    background: var(--gl-hover);
  }
  .demo-card:disabled {
    opacity: 0.55;
    cursor: default;
  }
  .cover {
    display: grid;
    flex: none;
    place-items: center;
    width: 64px;
    height: 64px;
    border-radius: var(--gl-radius-tile);
    background: linear-gradient(
      135deg,
      var(--gl-logo-peach),
      var(--gl-logo-mint) 55%,
      var(--gl-logo-lemon)
    );
    color: var(--gl-player-text);
    filter: var(--gl-photo-marker-shadow);
    --gl-icon-size: var(--gl-size-icon);
  }
  .body {
    display: grid;
    flex: 1;
    min-width: 0;
    gap: 2px;
  }
  .heading {
    font-weight: var(--gl-weight-semibold);
    font-size: var(--gl-size-body);
  }
  .line {
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
  .line.action {
    color: var(--gl-accent);
    font-weight: var(--gl-weight-medium);
  }
  .arrow {
    margin-inline-start: 4px;
  }
  .meter {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    height: 3px;
    overflow: hidden;
    background: var(--gl-hover);
  }
  .meter i {
    display: block;
    height: 100%;
    background: var(--gl-mint);
    transition: width 0.3s;
  }
  .meter i.indeterminate {
    width: 30%;
    animation: sweep 1.2s ease-in-out infinite alternate;
  }
  @keyframes sweep {
    from {
      transform: translateX(-20%);
    }
    to {
      transform: translateX(250%);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .meter i {
      transition: none;
    }
    .meter i.indeterminate {
      width: 100%;
      opacity: 0.4;
      animation: none;
    }
  }
</style>
