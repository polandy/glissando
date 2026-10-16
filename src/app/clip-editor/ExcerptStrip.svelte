<script lang="ts">
  import { getTranslator } from "../i18n/context";
  import {
    excerptAfterKey,
    excerptWithEnd,
    excerptWithStart,
    fractionToMs,
    type Excerpt,
    type Handle,
  } from "./clip-excerpt";

  /**
   * The whole clip as a strip with the excerpt between two handles. A handle is dragged or moved
   * with the arrow keys (Shift: a second; Home and End: to its limit). A drag reports every
   * position as a draft and the release as the final one, naming which handle moved so the
   * caller never has to guess it from the excerpt alone. The player's place is drawn as a line
   * over the track with a time chip below, shown as soon as that place is known.
   */
  let {
    sourceMs,
    excerpt,
    positionMs,
    onExcerpt,
  }: {
    sourceMs: number;
    excerpt: Excerpt;
    /** The player's place in the whole clip; null before a position is known. */
    positionMs: number | null;
    onExcerpt: (excerpt: Excerpt, final: boolean, handle: Handle) => void;
  } = $props();

  const MS_PER_SECOND = 1000;
  const PERCENT = 100;
  const { t, formatTenths } = getTranslator();
  const HANDLES = [
    { handle: "start", label: "clip.handleStart" },
    { handle: "end", label: "clip.handleEnd" },
  ] as const;
  /** Wide enough for the longest formatted time the chip shows, e.g. "12:34,5". */
  const CHIP_WIDTH_PX = 64;

  let track: HTMLDivElement | undefined = $state();
  let dragging: Handle | null = $state(null);

  const percentOf = (ms: number): number => (ms / sourceMs) * PERCENT;
  const valueOf = (handle: Handle): number =>
    handle === "start" ? excerpt.startMs : excerpt.endMs;

  function dragTo(handle: Handle, event: PointerEvent): Excerpt | null {
    if (track === undefined) return null;
    const { left, width } = track.getBoundingClientRect();
    const ms = fractionToMs((event.clientX - left) / width, sourceMs);
    return handle === "start"
      ? excerptWithStart(sourceMs, excerpt, ms)
      : excerptWithEnd(sourceMs, excerpt, ms);
  }

  function press(handle: Handle): void {
    dragging = handle;
  }

  // Listening on the window, not the handle, keeps the drag going once the pointer leaves it.
  function windowMove(event: PointerEvent): void {
    if (dragging === null) return;
    const next = dragTo(dragging, event);
    if (next !== null) onExcerpt(next, false, dragging);
  }

  function windowRelease(event: PointerEvent): void {
    if (dragging === null) return;
    const handle = dragging;
    const next = dragTo(handle, event);
    dragging = null;
    if (next !== null) onExcerpt(next, true, handle);
  }

  function windowCancel(): void {
    dragging = null;
  }

  function key(handle: Handle, event: KeyboardEvent): void {
    const next = excerptAfterKey(handle, sourceMs, excerpt, event.key, event.shiftKey);
    if (next === null) return;
    event.preventDefault();
    onExcerpt(next, true, handle);
  }
</script>

<svelte:window
  onpointermove={windowMove}
  onpointerup={windowRelease}
  onpointercancel={windowCancel}
/>

<div class="strip" role="group" aria-label={t("clip.strip")}>
  <div class="track" bind:this={track}>
    <span class="dim" style:left="0" style:width="{percentOf(excerpt.startMs)}%"></span>
    <span class="dim" style:right="0" style:width="{PERCENT - percentOf(excerpt.endMs)}%"></span>
    <span
      class="window"
      style:left="{percentOf(excerpt.startMs)}%"
      style:width="{percentOf(excerpt.endMs - excerpt.startMs)}%"
    ></span>
    {#if positionMs !== null}
      <span class="playhead" style:left="{percentOf(positionMs)}%" aria-hidden="true"></span>
    {/if}
    {#each HANDLES as { handle, label } (handle)}
      <div
        class="handle"
        class:active={dragging === handle}
        style:left="{percentOf(valueOf(handle))}%"
        role="slider"
        tabindex="0"
        aria-label={t(label)}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={sourceMs}
        aria-valuenow={valueOf(handle)}
        aria-valuetext={formatTenths(valueOf(handle) / MS_PER_SECOND)}
        onpointerdown={() => press(handle)}
        onkeydown={(event) => key(handle, event)}
      ></div>
    {/each}
    {#if positionMs !== null}
      <div
        class="chip mono"
        style:left="clamp(0px, calc({percentOf(positionMs)}% - {CHIP_WIDTH_PX / 2}px), calc(100% - {CHIP_WIDTH_PX}px))"
        style:width="{CHIP_WIDTH_PX}px"
        aria-hidden="true"
      >
        {formatTenths(positionMs / MS_PER_SECOND)}
      </div>
    {/if}
  </div>
</div>

<style>
  .strip {
    /* The bottom padding leaves room for the time chip below the track, so nothing jumps once
       a position becomes known. */
    padding: 10px 14px 40px;
  }
  .track {
    position: relative;
    height: 44px;
    border-radius: var(--gl-radius-small);
    background: var(--gl-hover);
    touch-action: none;
  }
  .dim {
    position: absolute;
    top: 0;
    bottom: 0;
    background: var(--gl-scrim);
    border-radius: var(--gl-radius-small);
  }
  .window {
    position: absolute;
    top: 0;
    bottom: 0;
    border-block: 3px solid var(--gl-accent);
    background: var(--gl-accent-tint);
  }
  /* The player's place at the whole clip's scale, over the window but under the handles. */
  .playhead {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    margin-left: -1px;
    background: var(--gl-ink);
    pointer-events: none;
  }
  .chip {
    position: absolute;
    top: calc(100% + 8px);
    padding: 3px 0;
    border-radius: var(--gl-radius-small);
    background: var(--gl-ink);
    color: var(--gl-surface);
    font-size: var(--gl-size-caption);
    font-weight: var(--gl-weight-semibold);
    text-align: center;
    pointer-events: none;
  }
  .handle {
    position: absolute;
    top: -4px;
    bottom: -4px;
    width: 14px;
    margin-left: -7px;
    border-radius: var(--gl-radius-small);
    background: var(--gl-accent);
    box-shadow: var(--gl-shadow);
    cursor: ew-resize;
    touch-action: none;
  }
  /* A touch target wider than the bar. */
  .handle::before {
    content: "";
    position: absolute;
    inset: -4px -7px;
  }
  .handle:focus-visible,
  .handle.active {
    outline: 3px solid var(--gl-accent-halo);
    outline-offset: 2px;
  }
</style>
