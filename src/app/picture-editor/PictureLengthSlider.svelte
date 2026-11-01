<script lang="ts">
  import {
    MAX_OWN_DURATION_MS,
    MIN_OWN_DURATION_MS,
    OWN_DURATION_STEP_MS,
  } from "../../library/own-timing";
  import { MILLISECONDS_PER_SECOND } from "../../player";
  import { getTranslator } from "../i18n/context";

  /**
   * How long the picture shows, as a slider on the half-second grid. The value beside the title
   * follows the thumb while it moves; the duration is stored on release or on a key's step.
   */
  let {
    durationMs,
    automaticMs,
    onDuration,
  }: {
    durationMs: number;
    /** What automatic would be; null when it is not one fixed value (shared music). */
    automaticMs: number | null;
    /** An own duration in whole milliseconds, on the half-second grid. */
    onDuration: (durationMs: number) => void;
  } = $props();

  const { t, formatTenthSeconds } = getTranslator();
  const seconds = (ms: number) => formatTenthSeconds(ms / MILLISECONDS_PER_SECOND);
  /** The labelled marks between the two ends of the scale, in seconds. */
  const SCALE_MIDDLE_SECONDS = [5, 10] as const;
  const PERCENT = 100;

  /** The value under the thumb while it moves; null once it is stored. */
  let live = $state<number | null>(null);
  const shownMs = $derived(live ?? durationMs);
  const share = (ms: number) =>
    (ms - MIN_OWN_DURATION_MS) / (MAX_OWN_DURATION_MS - MIN_OWN_DURATION_MS);
  const asMs = (input: HTMLInputElement) =>
    Math.round(Number(input.value) * MILLISECONDS_PER_SECOND);
</script>

<div class="slider">
  <div class="top">
    <h3 class="sub">{t("editor.pictureLength")}</h3>
    <output class="mono value">{seconds(shownMs)}</output>
  </div>
  <div class="range" style:--fill="{share(shownMs) * PERCENT}%">
    <input
      type="range"
      min={MIN_OWN_DURATION_MS / MILLISECONDS_PER_SECOND}
      max={MAX_OWN_DURATION_MS / MILLISECONDS_PER_SECOND}
      step={OWN_DURATION_STEP_MS / MILLISECONDS_PER_SECOND}
      value={durationMs / MILLISECONDS_PER_SECOND}
      aria-label={t("editor.pictureLength")}
      aria-valuetext={seconds(shownMs)}
      oninput={(event) => (live = asMs(event.currentTarget))}
      onchange={(event) => {
        live = null;
        onDuration(asMs(event.currentTarget));
      }}
    />
    {#if automaticMs !== null}
      <i
        class="mark"
        style:--at={share(automaticMs)}
        title={t("editor.lengthAutomaticMark", { seconds: seconds(automaticMs) })}
      ></i>
    {/if}
  </div>
  <div class="scale mono" aria-hidden="true">
    <span
      >{t("editor.lengthScale", { seconds: MIN_OWN_DURATION_MS / MILLISECONDS_PER_SECOND })}</span
    >
    {#each SCALE_MIDDLE_SECONDS as middle (middle)}<span>{middle}</span>{/each}
    <span
      >{t("editor.lengthScale", { seconds: MAX_OWN_DURATION_MS / MILLISECONDS_PER_SECOND })}</span
    >
  </div>
</div>

<style>
  .slider {
    --thumb: 24px;
    display: grid;
    gap: 2px;
  }
  .top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .sub {
    margin: 0;
    font-size: var(--gl-size-label);
    font-weight: var(--gl-weight-semibold);
  }
  .value {
    font-size: var(--gl-size-name);
    font-weight: var(--gl-weight-medium);
  }
  .range {
    position: relative;
    height: var(--gl-hit-min);
  }
  input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    background: transparent;
    appearance: none;
    cursor: pointer;
  }
  input::-webkit-slider-runnable-track {
    height: 6px;
    border-radius: 3px;
    background: linear-gradient(to right, var(--gl-accent) var(--fill), var(--gl-line) var(--fill));
  }
  input::-moz-range-track {
    height: 6px;
    border-radius: 3px;
    background: linear-gradient(to right, var(--gl-accent) var(--fill), var(--gl-line) var(--fill));
  }
  input::-webkit-slider-thumb {
    appearance: none;
    width: var(--thumb);
    height: var(--thumb);
    margin-top: calc((6px - var(--thumb)) / 2);
    border: 2px solid var(--gl-accent);
    border-radius: 50%;
    background: var(--gl-surface);
    box-shadow: var(--gl-shadow);
  }
  input::-moz-range-thumb {
    box-sizing: border-box;
    width: var(--thumb);
    height: var(--thumb);
    border: 2px solid var(--gl-accent);
    border-radius: 50%;
    background: var(--gl-surface);
  }
  /* A reference on the track, under the thumb's travel: the thumb's centre never reaches the ends. */
  .mark {
    position: absolute;
    top: calc(50% - 7px);
    left: calc(var(--thumb) / 2 + (100% - var(--thumb)) * var(--at));
    width: 2px;
    height: 14px;
    transform: translateX(-50%);
    background: var(--gl-muted);
    pointer-events: none;
  }
  .scale {
    display: flex;
    justify-content: space-between;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
</style>
