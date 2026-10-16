<script lang="ts">
  import { getTranslator } from "../i18n/context";

  /**
   * The scrub slider under the clip preview: an ink-line thumb at `valueMs` of `maxMs`,
   * reporting a drag or click as the place relative to the excerpt's start.
   */
  let {
    valueMs,
    maxMs,
    disabled,
    onScrub,
  }: {
    valueMs: number;
    maxMs: number;
    disabled: boolean;
    onScrub: (relativeMs: number) => void;
  } = $props();

  const PERCENT = 100;
  const { t } = getTranslator();
  const percent = $derived(maxMs > 0 ? (valueMs / maxMs) * PERCENT : 0);
</script>

<input
  class="scrub"
  type="range"
  min="0"
  max={maxMs}
  step="10"
  value={valueMs}
  style:--scrub-pct="{percent}%"
  aria-label={t("clip.scrub")}
  {disabled}
  oninput={(event) => onScrub(Number(event.currentTarget.value))}
/>

<style>
  .scrub {
    box-sizing: border-box;
    width: 100%;
    height: 22px;
    margin: 8px 0 0;
    appearance: none;
    background: transparent;
    cursor: pointer;
    /* Dragging along the slider must not scroll the page on a touch screen. */
    touch-action: pan-y;
  }
  .scrub:focus-visible {
    outline: 3px solid var(--gl-accent-halo);
    outline-offset: 2px;
  }
  /* The rail, filled up to the player's place by a gradient driven by --scrub-pct. */
  .scrub::-webkit-slider-runnable-track {
    height: 6px;
    border-radius: var(--gl-radius-small);
    background: linear-gradient(
      to right,
      var(--gl-accent-tint) var(--scrub-pct),
      var(--gl-hover) var(--scrub-pct)
    );
  }
  .scrub::-moz-range-track {
    height: 6px;
    border-radius: var(--gl-radius-small);
    background: linear-gradient(
      to right,
      var(--gl-accent-tint) var(--scrub-pct),
      var(--gl-hover) var(--scrub-pct)
    );
  }
  /* The thumb as a short ink line rather than the browser's round knob. */
  .scrub::-webkit-slider-thumb {
    appearance: none;
    width: 3px;
    height: 22px;
    margin-top: -8px;
    border: 0;
    border-radius: var(--gl-radius-tiny);
    background: var(--gl-ink);
  }
  .scrub::-moz-range-thumb {
    width: 3px;
    height: 22px;
    border: 0;
    border-radius: var(--gl-radius-tiny);
    background: var(--gl-ink);
  }
</style>
