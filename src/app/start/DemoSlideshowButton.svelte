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
  <span class="cover" aria-hidden="true">
    <span class="badge"><Icon name="play" /></span>
  </span>
  <span class="text">
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
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    padding: 0;
    overflow: hidden;
    border: none;
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
    box-shadow: var(--gl-shadow);
    color: var(--gl-ink);
    font: inherit;
    text-align: center;
    cursor: pointer;
  }
  .demo-card:hover:not(:disabled) {
    outline: 2px solid color-mix(in srgb, var(--gl-accent) 45%, transparent);
    outline-offset: -2px;
  }
  .demo-card:disabled {
    opacity: 0.55;
    cursor: default;
  }
  .cover {
    display: grid;
    flex: none;
    place-items: center;
    height: 120px;
    background: linear-gradient(
      135deg,
      var(--gl-logo-peach),
      var(--gl-logo-mint) 55%,
      var(--gl-logo-lemon)
    );
  }
  .badge {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: var(--gl-photo-play-bg);
    color: var(--gl-photo-play-ink);
    box-shadow: var(--gl-photo-play-shadow);
    --gl-icon-size: var(--gl-size-icon-small);
  }
  .text {
    display: grid;
    gap: 2px;
    padding: 12px 14px 14px;
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
