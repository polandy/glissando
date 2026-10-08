<script lang="ts">
  import Icon from "../../components/Icon.svelte";
  import { keepToastsClear } from "../../components/toast-clearance";
  import { getTranslator } from "../../i18n/context";

  /** What a selected picture tile offers, fixed to the bottom of the viewport. */
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
</script>

<div class="dock" use:keepToastsClear>
  {#if lastPicture}
    <p class="hint">{t("slideshow.lastPictureStays")}</p>
  {/if}
  <div class="bar" role="toolbar" aria-label={t("slideshow.selection")}>
    <span class="count mono">
      {t("slideshow.selectionCount", { number: index + 1, total: count })}
    </span>
    <span class="separator" aria-hidden="true"></span>
    <button class="btn" type="button" disabled={index === 0} onclick={onEarlier}>
      <Icon name="chevronLeft" /><span>{t("slideshow.earlier")}</span>
    </button>
    <button class="btn" type="button" disabled={index === count - 1} onclick={onLater}>
      <span>{t("slideshow.later")}</span><Icon name="chevronRight" />
    </button>
    <button class="btn remove" type="button" disabled={lastPicture} onclick={onRemove}>
      <Icon name="trash" /><span>{t("slideshow.remove")}</span>
    </button>
    <button class="btn done" type="button" onclick={onDone}>{t("slideshow.done")}</button>
  </div>
</div>

<style>
  .dock {
    position: fixed;
    left: 50%;
    bottom: 16px;
    z-index: 10;
    display: grid;
    justify-items: center;
    gap: 8px;
    max-width: calc(100% - 24px);
    translate: -50% 0;
  }
  .hint {
    margin: 0;
    padding: 5px 10px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-tile);
    background: var(--gl-surface);
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
    text-align: center;
  }
  .bar {
    display: flex;
    align-items: center;
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
  .bar .btn:hover:not(:disabled) {
    background: var(--gl-hover);
  }
  .bar .remove:hover:not(:disabled) {
    background: color-mix(in srgb, var(--gl-coral) 22%, var(--gl-surface));
  }
  .bar .done,
  .bar .done:hover {
    background: var(--gl-inverse-bg);
    color: var(--gl-inverse-text);
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
      bottom: 10px;
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
    .count,
    .separator {
      display: none;
    }
  }
</style>
