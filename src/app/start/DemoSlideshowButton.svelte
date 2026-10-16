<script lang="ts">
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import type { DemoSlideshowState } from "./demo-slideshow-flow";

  /** The start screen's third hero button: downloads the demo, then opens it like a picked file. */
  let { state, onLoad }: { state: DemoSlideshowState; onLoad: () => void } = $props();

  /** The demo download's own bytes-per-megabyte, rounded like `Translator.formatBytes`. */
  const BYTES_PER_MEGABYTE = 1_000_000;

  const { t } = getTranslator();
  const label = $derived.by(() => {
    if (state.kind !== "loading") return t("start.loadDemo");
    return state.total === null
      ? t("start.loadingDemo")
      : t("start.loadingDemoProgress", {
          received: megabytes(state.received),
          total: megabytes(state.total),
        });
  });

  /** Rounded like `Translator.formatBytes`, without its gigabyte fallback the demo never reaches. */
  function megabytes(bytes: number): number {
    return bytes > 0 ? Math.max(1, Math.round(bytes / BYTES_PER_MEGABYTE)) : 0;
  }
</script>

<button
  class="btn ghost"
  type="button"
  disabled={state.kind === "loading" || !state.online}
  onclick={onLoad}
>
  <Icon name="sparkle" />{label}
</button>
{#if state.kind === "loading"}
  <div class="meter">
    <i
      class:indeterminate={state.total === null}
      style:width={state.total === null ? undefined : `${(state.received / state.total) * 100}%`}
    ></i>
  </div>
{:else if !state.online}
  <p class="hint">{t("start.demoNeedsConnection")}</p>
{/if}

<style>
  .hint {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
  .meter {
    width: 100%;
    max-width: 260px;
    height: 6px;
    overflow: hidden;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-hover);
  }
  .meter i {
    display: block;
    height: 100%;
    border-radius: var(--gl-radius-pill);
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
