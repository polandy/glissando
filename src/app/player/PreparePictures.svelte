<script lang="ts">
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import type { MessageKey } from "../i18n/messages";
  import type { PlaybackQuality } from "../settings/playback-quality";
  import type { PreparingView } from "./prepare/prepare-flow";
  import "./player-overlay.css";

  /**
   * The black screen before a server slideshow plays (`dev-docs/app/PREPARING.md`): measuring
   * the first pictures, then preparing as many as playing needs, with "Start now" and, for 4K,
   * "Play in 1440". ✕ and Esc close.
   */
  let {
    title,
    view,
    onStartNow,
    onPlayInPreview,
    onClose,
  }: {
    title: string;
    view: PreparingView;
    onStartNow: () => void;
    onPlayInPreview: () => void;
    onClose: () => void;
  } = $props();

  /** Squares shown at most: enough to see the progress, few enough for one or two rows. */
  const SQUARES_SHOWN = 40;
  const QUALITY_NAME: Readonly<Record<PlaybackQuality, MessageKey>> = {
    "1440": "prepare.quality1440",
    "4k": "prepare.quality4k",
  };

  const { t, formatSeconds, formatDuration } = getTranslator();
  const quality = $derived(t(QUALITY_NAME[view.quality]));
  const squares = $derived(
    view.stage === "preparing"
      ? Array.from({ length: Math.min(view.pictureCount, SQUARES_SHOWN) }, (_, index) => index)
      : [],
  );

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") onClose();
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="player" role="dialog" aria-modal="true" aria-label={title}>
  <div class="top">
    <button
      class="glass"
      type="button"
      title={t("player.close")}
      aria-label={t("player.close")}
      onclick={onClose}
    >
      <Icon name="close" />
    </button>
    <div class="heading"><span class="name">{title}</span></div>
  </div>
  <div class="prepare">
    <div class="poster">
      <span class="badge">{quality}</span>
    </div>
    {#if view.stage === "measuring"}
      <h2>{t("prepare.measuringTitle")}</h2>
      <p class="line">{t("prepare.measuringLine", { count: view.measuring, quality })}</p>
      <div class="track"><div class="fill measuring"></div></div>
      <div class="nums">
        <span>{t("prepare.measuring")}</span>
        <span class="mono"
          ><b>{view.measured}</b> {t("prepare.ofMeasuring", { total: view.measuring })}</span
        >
      </div>
    {:else}
      <h2>{t("prepare.preparingTitle")}</h2>
      <p class="line">
        {t("prepare.preparingLine", {
          quality,
          picture: formatSeconds(view.secondsPerPicture),
          slide: formatSeconds(view.secondsPerSlide),
          target: view.target,
          count: view.pictureCount,
        })}
      </p>
      <div
        class="track"
        role="progressbar"
        aria-label={t("prepare.progressLabel")}
        aria-valuemin="0"
        aria-valuemax={view.target}
        aria-valuenow={view.ready}
      >
        <div class="fill" style:width="{(view.ready / view.target) * 100}%"></div>
      </div>
      <div class="nums">
        <span class="mono"
          ><b>{view.ready}</b> {t("prepare.ofPictures", { total: view.target })}</span
        >
        <span
          >{t("prepare.startsIn")}
          <b class="mono">~{formatDuration(Math.ceil(view.secondsLeft))}</b></span
        >
      </div>
      <div class="squares" aria-hidden="true">
        {#each squares as index (index)}
          <i class:ready={index < view.ready} class:needed={index < view.target}></i>
        {/each}
      </div>
    {/if}
    <div class="actions">
      <button class="pill start" type="button" onclick={onStartNow}>{t("prepare.startNow")}</button>
      {#if view.quality === "4k"}
        <button class="pill" type="button" onclick={onPlayInPreview}>
          {t("prepare.playInPreview")}
        </button>
      {/if}
    </div>
  </div>
  <p class="footnote">{t("prepare.footnote")}</p>
</div>

<style>
  .player {
    display: grid;
    grid-template-rows: auto 1fr auto;
  }
  .top {
    position: static;
    background: none;
  }
  .prepare {
    align-self: center;
    justify-self: center;
    display: grid;
    gap: 14px;
    width: min(100% - 32px, 420px);
  }
  .poster {
    position: relative;
    overflow: hidden;
    aspect-ratio: 3 / 2;
    border-radius: var(--gl-radius);
    background: var(--gl-player-glass);
  }
  .badge {
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 2px 8px;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-player-scrim-bottom);
    font-size: var(--gl-size-small);
  }
  h2 {
    margin: 0;
    font-family: var(--gl-font-display);
    font-weight: var(--gl-weight-title);
    font-size: var(--gl-size-title);
  }
  .line,
  .footnote {
    margin: 0;
    color: var(--gl-player-muted);
    font-size: var(--gl-size-meta);
  }
  .footnote {
    padding: 10px 20px calc(16px + env(safe-area-inset-bottom));
  }
  .track {
    position: relative;
    overflow: hidden;
    height: 6px;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-player-track);
  }
  .fill {
    height: 100%;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-mint);
    transition: width 0.35s ease;
  }
  .fill.measuring {
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
  .nums {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    color: var(--gl-player-muted);
    font-size: var(--gl-size-meta);
  }
  .nums b {
    color: var(--gl-player-text);
    font-weight: var(--gl-weight-medium);
  }
  .mono {
    font-family: var(--gl-font-mono);
    font-variant-numeric: tabular-nums;
  }
  .squares {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .squares i {
    width: 10px;
    height: 10px;
    border-radius: var(--gl-radius-tiny);
    background: var(--gl-player-track);
  }
  .squares i.ready {
    background: var(--gl-mint);
  }
  .squares i.needed {
    outline: 1px solid var(--gl-player-outline);
    outline-offset: 1px;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .pill.start {
    background: var(--gl-accent);
    color: var(--gl-accent-ink);
  }
  @media (prefers-reduced-motion: reduce) {
    .fill {
      transition: none;
    }
    .fill.measuring {
      width: 100%;
      opacity: 0.4;
      animation: none;
    }
  }
</style>
