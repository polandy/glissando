<script lang="ts">
  import Icon from "../../components/Icon.svelte";
  import { getTranslator } from "../../i18n/context";

  /**
   * The scissors on the bridge between a portrait pair's two tiles (ADR-0028): shown while a
   * mouse hovers the pair and while either picture is selected; one click splits the pair.
   */
  let {
    first,
    second,
    shown,
    onSplit,
  }: {
    /** The pair's play-order numbers, from 1. */
    first: number;
    second: number;
    /** A picture of the pair is selected: shown on any pointer, and reachable by Tab. */
    shown: boolean;
    onSplit: () => void;
  } = $props();

  const { t } = getTranslator();
</script>

<button
  class="split"
  class:shown
  type="button"
  tabindex={shown ? 0 : -1}
  aria-label={t("slideshow.splitPairLabel", { first, second })}
  title={t("slideshow.splitPair")}
  onclick={onSplit}
>
  <Icon name="scissors" />
</button>

<style>
  .split {
    position: absolute;
    top: 50%;
    left: calc(100% + var(--tile-gap) / 2);
    z-index: 3;
    display: grid;
    place-items: center;
    --split-size: 28px;
    width: var(--split-size);
    height: var(--split-size);
    padding: 0;
    border: 0;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-accent);
    color: var(--gl-accent-ink);
    box-shadow: 0 0 0 2px var(--gl-surface);
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    transform: translate(-50%, -50%) scale(0.85);
    --gl-icon-size: 15px;
  }
  /* A larger hit area than the drawn circle, for a finger. */
  .split::before {
    content: "";
    position: absolute;
    inset: calc((var(--split-size) - var(--gl-hit-min)) / 2);
  }
  /* Cut by a row break or a chapter: on the first tile's edge instead of the bridge. */
  :global(.tile[data-pair-cut]) > .split {
    left: auto;
    right: calc(var(--split-size) / -2);
    transform: translate(0, -50%) scale(0.85);
  }
  .split.shown,
  .split:focus-visible {
    opacity: 1;
    pointer-events: auto;
    transform: translate(-50%, -50%);
  }
  :global(.tile[data-pair-cut]) > .split.shown {
    transform: translate(0, -50%);
  }
  .split:focus-visible {
    outline: 3px solid var(--gl-accent);
    outline-offset: 2px;
  }
  /* A mouse over either tile of the pair. Selecting several hides it: a click there picks. */
  @media (hover: hover) and (pointer: fine) {
    :global(.tile:not(.selecting-mode):hover) > .split,
    :global(.tile:not(.selecting-mode):has(+ .tile:hover)) > .split {
      opacity: 1;
      pointer-events: auto;
      transform: translate(-50%, -50%);
    }
    :global(.tile[data-pair-cut]:not(.selecting-mode):hover) > .split,
    :global(.tile[data-pair-cut]:not(.selecting-mode):has(+ .tile:hover)) > .split {
      transform: translate(0, -50%);
    }
  }
  @media (prefers-reduced-motion: no-preference) {
    .split {
      transition:
        opacity 0.12s,
        transform 0.12s;
    }
  }
</style>
