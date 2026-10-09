<script lang="ts">
  import { cubicOut } from "svelte/easing";
  import type { TransitionConfig } from "svelte/transition";
  import { getTranslator } from "../i18n/context";
  import type { FocusIndication } from "./focus-indication";

  /**
   * Accent corner brackets around the subject box the automatic motion aims at, with a small
   * "Focus" chip; over the frames, never in the way of a drag. It fades in when the focus is
   * found while the editor is open, not when the editor opens on it.
   */
  let {
    marker,
    reducedMotion,
  }: {
    marker: Extract<FocusIndication, { kind: "marker" }> | null;
    reducedMotion: boolean;
  } = $props();

  const { t } = getTranslator();

  const ENTER_MS = 320;
  /** The marker settles onto the box from slightly larger. */
  const ENTER_SCALE = 0.14;

  /** A Svelte transition: it needs no look at the node, only the time to take. */
  const settle: (node: Element) => TransitionConfig = () => ({
    duration: reducedMotion ? 0 : ENTER_MS,
    easing: cubicOut,
    css: (shown: number) => `opacity: ${shown}; transform: scale(${1 + ENTER_SCALE * (1 - shown)})`,
  });

  const percent = (fraction: number) => `${fraction * 100}%`;
</script>

{#if marker !== null}
  <div
    class="marker"
    class:below={marker.chip.below}
    class:right={marker.chip.alignRight}
    style:left={percent(marker.box.x)}
    style:top={percent(marker.box.y)}
    style:width={percent(marker.box.width)}
    style:height={percent(marker.box.height)}
    role="img"
    aria-label={t("editor.focusMarker")}
    in:settle
  >
    <i class="corner top-left"></i>
    <i class="corner top-right"></i>
    <i class="corner bottom-left"></i>
    <i class="corner bottom-right"></i>
    <span class="chip">{t("editor.focusChip")}</span>
  </div>
{/if}

<style>
  .marker {
    --corner-reach: -4px;
    position: absolute;
    z-index: 4;
    pointer-events: none;
    filter: var(--gl-photo-marker-shadow);
  }
  .corner {
    position: absolute;
    width: clamp(7px, 30%, 14px);
    height: clamp(7px, 30%, 14px);
    border: 2.5px solid var(--gl-accent);
  }
  .top-left {
    left: var(--corner-reach);
    top: var(--corner-reach);
    border-right: 0;
    border-bottom: 0;
    border-top-left-radius: 4px;
  }
  .top-right {
    right: var(--corner-reach);
    top: var(--corner-reach);
    border-left: 0;
    border-bottom: 0;
    border-top-right-radius: 4px;
  }
  .bottom-left {
    left: var(--corner-reach);
    bottom: var(--corner-reach);
    border-right: 0;
    border-top: 0;
    border-bottom-left-radius: 4px;
  }
  .bottom-right {
    right: var(--corner-reach);
    bottom: var(--corner-reach);
    border-left: 0;
    border-top: 0;
    border-bottom-right-radius: 4px;
  }
  .chip {
    position: absolute;
    left: var(--corner-reach);
    bottom: calc(100% + 8px);
    padding: 2px 7px;
    border-radius: var(--gl-radius-small);
    background: var(--gl-accent);
    color: var(--gl-accent-ink);
    font: var(--gl-weight-semibold) var(--gl-size-caption) var(--gl-font-ui);
    letter-spacing: 0.03em;
    white-space: nowrap;
  }
  .below .chip {
    top: calc(100% + 8px);
    bottom: auto;
  }
  .right .chip {
    right: var(--corner-reach);
    left: auto;
  }
</style>
