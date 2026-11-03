<script lang="ts">
  import { getTranslator } from "../i18n/context";

  /** The frame's exit button and its pause and next bar; they fade out while the screen is idle. */
  let {
    idle,
    paused,
    onExit,
    onTogglePause,
    onSkip,
  }: {
    idle: boolean;
    paused: boolean;
    onExit: () => void;
    onTogglePause: () => void;
    onSkip: () => void;
  } = $props();
  const { t } = getTranslator();
</script>

<div class="controls" class:idle>
  <button class="exit" type="button" onclick={onExit}>{t("frame.exit")}</button>
  <div class="bar">
    <button type="button" onclick={onTogglePause}>
      {paused ? t("frame.resume") : t("frame.pause")}
    </button>
    <button type="button" onclick={onSkip}>{t("frame.next")}</button>
  </div>
</div>

<style>
  .exit,
  .bar {
    position: absolute;
    z-index: 1;
    color: var(--gl-player-text);
    transition: opacity 0.2s;
  }
  .idle .exit,
  .idle .bar {
    opacity: 0;
    pointer-events: none;
  }
  .exit {
    top: 16px;
    left: 16px;
    padding: 8px 14px;
    border: 0;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-photo-badge);
    color: var(--gl-player-text);
    font: inherit;
    cursor: pointer;
  }
  .bar {
    bottom: 20px;
    left: 50%;
    display: flex;
    gap: 6px;
    padding: 8px;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-photo-badge);
    transform: translateX(-50%);
  }
  .bar button {
    padding: 8px 14px;
    border: 0;
    border-radius: var(--gl-radius-pill);
    background: transparent;
    color: var(--gl-player-text);
    font: inherit;
    cursor: pointer;
  }
  .bar button:hover {
    background: var(--gl-player-glass);
  }
</style>
