<script lang="ts">
  import Icon from "../../components/Icon.svelte";
  import { keepToastsClear } from "../../components/toast-clearance";
  import { getTranslator } from "../../i18n/context";

  /**
   * What a selected picture tile offers, fixed to the bottom of the viewport. Its height and
   * inset come from the screen, which keeps that much room below its content.
   */
  let {
    index,
    count,
    onEarlier,
    onLater,
    onRemove,
    onDone,
  }: {
    /** The selected picture's position in play order, from 0. */
    index: number;
    count: number;
    onEarlier: () => void;
    onLater: () => void;
    onRemove: () => void;
    onDone: () => void;
  } = $props();

  const { t } = getTranslator();
  const lastPicture = $derived(count < 2);
  const first = $derived(index === 0);
  const last = $derived(index === count - 1);

  function earlier(): void {
    if (!first) {
      onEarlier();
    }
  }

  function later(): void {
    if (!last) {
      onLater();
    }
  }
</script>

<div class="dock" use:keepToastsClear>
  <div class="bar" role="toolbar" aria-label={t("slideshow.selection")}>
    <!-- Announced on every move; on a narrow screen hidden from sight, not from screen readers. -->
    <span class="count mono" aria-live="polite">
      {t("slideshow.selectionCount", { number: index + 1, total: count })}
    </span>
    <span class="separator" aria-hidden="true"></span>
    <!-- At the ends Earlier and Later look off but keep their place in the tab order. -->
    <button class="btn" type="button" aria-disabled={first} onclick={earlier}>
      <Icon name="chevronLeft" /><span>{t("slideshow.earlier")}</span>
    </button>
    <button class="btn" type="button" aria-disabled={last} onclick={later}>
      <span>{t("slideshow.later")}</span><Icon name="chevronRight" />
    </button>
    <!-- The last picture stays: Remove looks off but still answers, saying why. -->
    <button class="btn remove" type="button" aria-disabled={lastPicture} onclick={onRemove}>
      <Icon name="trash" /><span>{t("slideshow.remove")}</span>
    </button>
    <button class="btn done" type="button" onclick={onDone}>{t("slideshow.done")}</button>
  </div>
</div>

<style>
  .dock {
    position: fixed;
    left: 50%;
    bottom: var(--selection-bar-inset);
    z-index: 10;
    display: grid;
    justify-items: center;
    gap: 8px;
    max-width: calc(100% - 24px);
    translate: -50% 0;
  }
  .bar {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    height: var(--selection-bar-height);
    gap: 4px;
    padding: 6px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
    box-shadow: var(--gl-shadow);
  }
  .bar .btn {
    height: 40px;
    padding: 0 12px;
    border-color: transparent;
    background: transparent;
  }
  .bar .done,
  .bar .done:hover {
    background: var(--gl-inverse-bg);
    color: var(--gl-inverse-text);
  }
  /* A touch screen keeps the last tapped button "hovered": highlight for a mouse only. */
  @media (hover: hover) {
    .bar .btn:hover:not(:disabled, [aria-disabled="true"], .done) {
      background: var(--gl-hover);
    }
    .bar .remove:hover:not([aria-disabled="true"]) {
      background: color-mix(in srgb, var(--gl-coral) 22%, var(--gl-surface));
    }
  }
  .count {
    padding: 0 8px 0 6px;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
    white-space: nowrap;
  }
  .separator {
    width: 1px;
    height: 24px;
    background: var(--gl-line);
  }
  @container (max-width: 720px) {
    .dock {
      left: 8px;
      right: 8px;
      max-width: none;
      justify-items: stretch;
      translate: none;
    }
    .bar {
      justify-content: space-between;
    }
    .bar .btn {
      gap: 5px;
      padding: 0 9px;
      font-size: var(--gl-size-label);
    }
    .count {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      overflow: hidden;
      clip-path: inset(50%);
    }
    .separator {
      display: none;
    }
  }
</style>
