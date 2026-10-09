<script lang="ts">
  import type { MusicTrim } from "../../library/own-music";
  import { MILLISECONDS_PER_SECOND, musicGainAt } from "../../player";
  import { getTranslator } from "../i18n/context";
  import type { MusicEditorView } from "./music-editor-view";
  import {
    ARROW_STEP_LARGE_MS,
    ARROW_STEP_MS,
    moveTrimEdge,
    nearerEdge,
    type TrimEdge,
  } from "./trim-edges";
  import { waveformPeaks } from "./waveform-peaks";
  import { barCountFor, percentOf, rulerTicksMs } from "./waveform-scale";

  /**
   * The whole track as a waveform with the excerpt's two handles, the volume's fade envelope
   * over it and the time ruler below. A grab anywhere moves the nearer handle.
   */
  let {
    music,
    peaks,
    playheadMs,
    onDraft,
    onCommit,
    onGrab,
  }: {
    music: MusicEditorView;
    /** Fine peaks of the whole track, 0..1; null while the track is decoded. */
    peaks: Float32Array | null;
    /** Where a listen is in the track; null while none plays. */
    playheadMs: number | null;
    /** The excerpt while a handle is dragged. */
    onDraft: (trim: MusicTrim) => void;
    /** The excerpt a drag or a key settled on. */
    onCommit: (trim: MusicTrim) => void;
    /** A handle was grabbed. */
    onGrab: () => void;
  } = $props();

  const { t, formatTenths, formatDuration } = getTranslator();
  const EDGES: readonly TrimEdge[] = ["start", "end"];
  /** A slider's arrows: left and down earlier, right and up later. */
  const ARROW_DIRECTIONS: Readonly<Record<string, number>> = {
    ArrowLeft: -1,
    ArrowDown: -1,
    ArrowRight: 1,
    ArrowUp: 1,
  };
  const EDGE_LABELS = { start: "music.start", end: "music.end" } as const;
  /** The SVG's own units; it stretches to the waveform's box. */
  const VIEW_WIDTH = 1000;
  const VIEW_HEIGHT = 100;
  /** Bars inside a fade never shrink below this share, so the shape stays readable. */
  const MIN_FADED_SHARE = 0.06;
  /** A silent bar still shows as a line. */
  const MIN_BAR_HEIGHT = 1.5;
  /** Share of a bar's slot the bar fills. */
  const BAR_FILL = 0.64;
  /** Where the envelope line rests at full volume, just inside the top. */
  const ENVELOPE_TOP = 2;

  let wave = $state<HTMLDivElement>();
  let width = $state(0);
  let drag: {
    readonly edge: TrimEdge;
    readonly offsetMs: number;
    readonly pointerId: number;
    readonly from: MusicTrim;
    trim: MusicTrim;
  } | null = null;

  const trim = $derived({ startMs: music.startMs, endMs: music.endMs });
  const pct = (ms: number) => percentOf(ms, music.durationMs);
  const seconds = (ms: number) => ms / MILLISECONDS_PER_SECOND;

  const bars = $derived.by(() => {
    const count = barCountFor(width);
    const heights = peaks === null ? Array<number>(count).fill(0) : waveformPeaks(peaks, count);
    return heights.map((height, index) => {
      const atMs = ((index + 0.5) / count) * music.durationMs;
      const inside = atMs >= music.startMs && atMs <= music.audibleEndMs;
      const gain = inside
        ? Math.max(MIN_FADED_SHARE, musicGainAt(music.timing, atMs - music.startMs))
        : 1;
      return {
        x: (index / count) * VIEW_WIDTH,
        height: Math.max(MIN_BAR_HEIGHT, height * gain * VIEW_HEIGHT),
        inside,
      };
    });
  });
  const barWidth = $derived((VIEW_WIDTH / barCountFor(width)) * BAR_FILL);
  const envelope = $derived.by(() => {
    const { startMs, endMs, fadeInMs, fadeOutMs } = music.timing;
    const x = (ms: number) => (ms / music.durationMs) * VIEW_WIDTH;
    return [
      [x(startMs), fadeInMs > 0 ? VIEW_HEIGHT : ENVELOPE_TOP],
      [x(startMs + fadeInMs), ENVELOPE_TOP],
      [x(endMs - fadeOutMs), ENVELOPE_TOP],
      [x(endMs), fadeOutMs > 0 ? VIEW_HEIGHT : ENVELOPE_TOP],
    ]
      .map(([px, py]) => `${px},${py}`)
      .join(" ");
  });
  const ticks = $derived(rulerTicksMs(music.durationMs, width));

  function atMsOf(event: PointerEvent): number {
    const rect = (wave as HTMLDivElement).getBoundingClientRect();
    return ((event.clientX - rect.left) / rect.width) * music.durationMs;
  }

  function edgeMs(edge: TrimEdge, of: MusicTrim): number {
    return edge === "start" ? of.startMs : of.endMs;
  }

  // The drag follows the pointer on the window, as the picture editor's frames do: a move
  // outside the waveform, or over a handle that moved, still reaches it.
  function onpointerdown(event: PointerEvent): void {
    if (event.button > 0 || wave === undefined) {
      return;
    }
    const atMs = atMsOf(event);
    const grabbed = (event.target as Element).closest<HTMLElement>("[data-edge]")?.dataset["edge"];
    const edge = EDGES.find((known) => known === grabbed) ?? nearerEdge(trim, atMs);
    drag = {
      edge,
      offsetMs: atMs - edgeMs(edge, trim),
      pointerId: event.pointerId,
      from: trim,
      trim,
    };
    onGrab();
    event.preventDefault();
  }

  function onpointermove(event: PointerEvent): void {
    if (drag === null || event.pointerId !== drag.pointerId) {
      return;
    }
    drag.trim = moveTrimEdge(drag.trim, drag.edge, atMsOf(event) - drag.offsetMs, music.durationMs);
    onDraft(drag.trim);
  }

  function release(event: PointerEvent): void {
    if (drag === null || event.pointerId !== drag.pointerId) {
      return;
    }
    const { from, trim: settled } = drag;
    drag = null;
    if (settled.startMs !== from.startMs || settled.endMs !== from.endMs) {
      onCommit(settled);
    }
  }

  function onkeydown(event: KeyboardEvent, edge: TrimEdge): void {
    const direction = ARROW_DIRECTIONS[event.key];
    if (direction === undefined) {
      return;
    }
    event.preventDefault();
    const stepMs = event.shiftKey ? ARROW_STEP_LARGE_MS : ARROW_STEP_MS;
    onCommit(moveTrimEdge(trim, edge, edgeMs(edge, trim) + direction * stepMs, music.durationMs));
  }
</script>

<svelte:window {onpointermove} onpointerup={release} onpointercancel={release} />

<div class="wave" bind:this={wave} bind:clientWidth={width} {onpointerdown} role="presentation">
  <svg
    class="bars"
    viewBox="0 0 {VIEW_WIDTH} {VIEW_HEIGHT}"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    {#each bars as bar, index (index)}
      <rect
        class:inside={bar.inside}
        x={bar.x + (VIEW_WIDTH / bars.length - barWidth) / 2}
        y={(VIEW_HEIGHT - bar.height) / 2}
        width={barWidth}
        height={bar.height}
      />
    {/each}
    <polyline class="envelope" points={envelope} />
  </svg>
  <div class="out" style:left="0" style:width={pct(music.startMs)}></div>
  <div class="out" style:left={pct(music.endMs)} style:right="0"></div>
  {#if music.audibleEndMs < music.endMs}
    <div
      class="out silent"
      style:left={pct(music.audibleEndMs)}
      style:width="calc({pct(music.endMs)} - {pct(music.audibleEndMs)})"
    ></div>
  {/if}
  {#each EDGES as edge (edge)}
    {@const atMs = edgeMs(edge, trim)}
    <div class="handle {edge}" style:left={pct(atMs)} data-edge={edge}>
      <span class="grip"></span>
      <button
        type="button"
        role="slider"
        aria-label={t(EDGE_LABELS[edge])}
        aria-valuemin={0}
        aria-valuemax={music.durationMs}
        aria-valuenow={atMs}
        aria-valuetext={formatTenths(seconds(atMs))}
        onkeydown={(event) => onkeydown(event, edge)}
      >
        <span>{t(EDGE_LABELS[edge])}</span>{formatTenths(seconds(atMs))}
      </button>
    </div>
  {/each}
  {#if playheadMs !== null}
    <div class="playhead" style:left={pct(playheadMs)}></div>
  {/if}
</div>
<div class="ruler mono" aria-hidden="true">
  {#each ticks as tickMs (tickMs)}
    <span style:left={pct(tickMs)}>{formatDuration(seconds(tickMs))}</span>
  {/each}
</div>

<style>
  .wave {
    position: relative;
    height: 150px;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    cursor: ew-resize;
  }
  .bars {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .bars rect {
    fill: var(--gl-faint);
    fill-opacity: 0.45;
  }
  .bars rect.inside {
    fill: var(--gl-ink);
    fill-opacity: 0.78;
  }
  .envelope {
    fill: none;
    stroke: var(--gl-accent);
    stroke-width: 2.2;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }
  .out {
    position: absolute;
    top: -4px;
    bottom: -4px;
    background: color-mix(in srgb, var(--gl-ground) 72%, transparent);
    pointer-events: none;
  }
  /* Between where the slideshow ends and where the excerpt would: not heard. */
  .out.silent {
    background: repeating-linear-gradient(
      135deg,
      color-mix(in srgb, var(--gl-ground) 70%, transparent) 0 4px,
      transparent 4px 8px
    );
  }
  .handle {
    position: absolute;
    top: -8px;
    bottom: -8px;
    z-index: 2;
    width: 0;
  }
  .handle::before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: -1px;
    width: 2px;
    background: var(--gl-accent);
  }
  .grip {
    position: absolute;
    top: 50%;
    left: 0;
    width: 14px;
    height: 34px;
    border: 2px solid var(--gl-surface);
    border-radius: 7px;
    background: var(--gl-accent);
    transform: translate(-50%, -50%);
  }
  /* A larger target than the grip shows. */
  .grip::before {
    content: "";
    position: absolute;
    inset: -14px -16px;
  }
  .handle button {
    position: absolute;
    top: -30px;
    left: 0;
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 4px 8px;
    border: 0;
    border-radius: var(--gl-radius-small);
    background: var(--gl-accent);
    color: var(--gl-accent-ink);
    font-family: var(--gl-font-mono);
    font-size: var(--gl-size-small);
    font-weight: var(--gl-weight-semibold);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    cursor: ew-resize;
    touch-action: none;
  }
  .handle button span {
    font-family: var(--gl-font-ui);
    opacity: 0.75;
  }
  /* The labels open away from each other: the start's to the right, the end's to the left. */
  .handle.start button {
    transform: translateX(-12px);
  }
  .handle.end button {
    transform: translateX(calc(-100% + 12px));
  }
  .playhead {
    position: absolute;
    top: -6px;
    bottom: -6px;
    z-index: 3;
    width: 2px;
    margin-left: -1px;
    background: var(--gl-ink);
    pointer-events: none;
  }
  .ruler {
    position: relative;
    height: 16px;
    margin-top: 8px;
    color: var(--gl-faint);
    font-size: var(--gl-size-small);
  }
  .ruler span {
    position: absolute;
    white-space: nowrap;
    transform: translateX(-50%);
  }
  .ruler span:first-child {
    transform: none;
  }
  .ruler span:last-child {
    transform: translateX(-100%);
  }
  @container (max-width: 720px) {
    .wave {
      height: 110px;
    }
  }
</style>
