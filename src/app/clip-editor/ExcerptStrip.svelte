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
   * position as a draft and the release as the final one.
   */
  let {
    sourceMs,
    excerpt,
    onExcerpt,
  }: {
    sourceMs: number;
    excerpt: Excerpt;
    onExcerpt: (excerpt: Excerpt, final: boolean) => void;
  } = $props();

  const MS_PER_SECOND = 1000;
  const PERCENT = 100;
  const { t, formatTenths } = getTranslator();
  const HANDLES = [
    { handle: "start", label: "clip.handleStart" },
    { handle: "end", label: "clip.handleEnd" },
  ] as const;

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

  function press(handle: Handle, event: PointerEvent): void {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    dragging = handle;
  }

  function move(handle: Handle, event: PointerEvent): void {
    if (dragging !== handle) return;
    const next = dragTo(handle, event);
    if (next !== null) onExcerpt(next, false);
  }

  function release(handle: Handle, event: PointerEvent): void {
    if (dragging !== handle) return;
    dragging = null;
    const next = dragTo(handle, event);
    if (next !== null) onExcerpt(next, true);
  }

  function key(handle: Handle, event: KeyboardEvent): void {
    const next = excerptAfterKey(handle, sourceMs, excerpt, event.key, event.shiftKey);
    if (next === null) return;
    event.preventDefault();
    onExcerpt(next, true);
  }
</script>

<div class="strip" role="group" aria-label={t("clip.strip")}>
  <div class="track" bind:this={track}>
    <span class="dim" style:left="0" style:width="{percentOf(excerpt.startMs)}%"></span>
    <span class="dim" style:right="0" style:width="{PERCENT - percentOf(excerpt.endMs)}%"></span>
    <span
      class="window"
      style:left="{percentOf(excerpt.startMs)}%"
      style:width="{percentOf(excerpt.endMs - excerpt.startMs)}%"
    ></span>
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
        onpointerdown={(event) => press(handle, event)}
        onpointermove={(event) => move(handle, event)}
        onpointerup={(event) => release(handle, event)}
        onpointercancel={() => (dragging = null)}
        onkeydown={(event) => key(handle, event)}
      ></div>
    {/each}
  </div>
</div>

<style>
  .strip {
    padding: 10px 14px;
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
    inset: -4px -15px;
  }
  .handle:focus-visible,
  .handle.active {
    outline: 3px solid var(--gl-accent-halo);
    outline-offset: 2px;
  }
</style>
