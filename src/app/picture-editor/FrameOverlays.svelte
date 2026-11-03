<script lang="ts">
  import type { OwnKenBurns } from "../../library/own-ken-burns";
  import type { Framing, Rect, Size } from "../../player";
  import { frameRect, frameStyle, rectStyle } from "./frame-geometry";
  import FocusMarker from "./FocusMarker.svelte";
  import type { FocusIndication } from "./focus-indication";
  import { FRAME_KEYS, type FrameKey } from "./frame-keys";
  import PictureFrame from "./PictureFrame.svelte";

  /** What `FrameWell` draws over the picture: the veil, both frames, the path, the playhead, the focus. */
  let {
    size,
    motion,
    active,
    playhead,
    focus,
    reducedMotion,
    onActivate,
    onKeydown,
  }: {
    size: Size;
    motion: OwnKenBurns;
    active: FrameKey;
    playhead: Rect | null;
    focus: FocusIndication;
    reducedMotion: boolean;
    onActivate: (key: FrameKey) => void;
    onKeydown: (event: KeyboardEvent) => void;
  } = $props();

  function centre(framing: Framing) {
    const { x, y, width, height } = frameRect(framing, size);
    return { x: (x + width / 2) * 100, y: (y + height / 2) * 100 };
  }

  const path = $derived({ from: centre(motion.from), to: centre(motion.to) });
</script>

<!-- The veil darkens the picture around the active frame; its own clip spares the handles. -->
<div class="veil" aria-hidden="true">
  <div class="hole" style={frameStyle(motion[active], size)}></div>
</div>
{#each FRAME_KEYS as key (key)}
  <PictureFrame
    {key}
    framing={motion[key]}
    {size}
    active={key === active}
    {onActivate}
    {onKeydown}
  />
{/each}
<svg class="path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
  <line x1={path.from.x} y1={path.from.y} x2={path.to.x} y2={path.to.y} />
</svg>
{#if playhead !== null}
  <div class="playhead" style={rectStyle(playhead)} aria-hidden="true"></div>
{/if}
<FocusMarker indication={focus} {reducedMotion} />

<style>
  .veil {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }
  .hole {
    position: absolute;
    border-radius: 2px;
    box-shadow: 0 0 0 100vmax var(--gl-photo-veil);
  }
  .path {
    position: absolute;
    inset: 0;
    z-index: 2;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  .path line {
    stroke: var(--gl-photo-dashed);
    stroke-width: 1.5;
    stroke-dasharray: 4 4;
    vector-effect: non-scaling-stroke;
  }
  .playhead {
    position: absolute;
    z-index: 3;
    box-sizing: border-box;
    border: 1.5px solid var(--gl-player-progress);
    border-radius: 2px;
    pointer-events: none;
  }
</style>
