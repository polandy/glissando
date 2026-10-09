<script lang="ts">
  import type { OwnKenBurns } from "../../library/own-ken-burns";
  import type { Framing, Rect, Size } from "../../player";
  import {
    frameRect,
    frameStyle,
    rectStyle,
    framingForKey,
    wheelZoomedFraming,
    type Corner,
  } from "./frame-geometry";
  import FocusMarker from "./FocusMarker.svelte";
  import type { FocusIndication } from "./focus-indication";
  import { FrameGesture } from "./frame-gesture";
  import { tappedFrame, TAP_TOLERANCE_PX } from "./frame-hit";
  import { FRAME_KEYS, type FrameKey } from "./frame-keys";
  import PictureFrame from "./PictureFrame.svelte";

  /**
   * The picture with the motion's two frames on it. A drag anywhere on the picture moves the
   * active frame, its corners resize it, wheel, pinch and + / − zoom it, arrow keys move it; it
   * never leaves the picture. A tap picks the frame it unambiguously lies on.
   */
  let {
    size,
    pictureUrl,
    alt,
    motion,
    active,
    playhead,
    focus,
    reducedMotion,
    onActivate,
    onFraming,
  }: {
    size: Size;
    pictureUrl: string | null;
    alt: string;
    motion: OwnKenBurns;
    active: FrameKey;
    /** Where the playing preview is, outlined on the picture; null while it is paused. */
    playhead: Rect | null;
    /** The focus the automatic motion aims at, marked on the picture when there is a box. */
    focus: FocusIndication;
    reducedMotion: boolean;
    onActivate: (key: FrameKey) => void;
    /** A frame changed; `final` once a gesture ends, while dragging it is false. */
    onFraming: (key: FrameKey, framing: Framing, final: boolean) => void;
  } = $props();

  let fitWidth = $state(0);
  let fitHeight = $state(0);
  let pictureElement = $state<HTMLElement>();
  const aspect = $derived(size.width / size.height);
  /** The picture fitted whole into the well. */
  const shownWidth = $derived(Math.min(fitWidth, fitHeight * aspect));

  // The size is fixed for the well's lifetime: the editor screen is keyed by picture.
  // svelte-ignore state_referenced_locally
  const gesture = new FrameGesture(size);

  function centre(framing: Framing) {
    const { x, y, width, height } = frameRect(framing, size);
    return { x: (x + width / 2) * 100, y: (y + height / 2) * 100 };
  }

  /** `PointerEvent.button` of a mouse's main button. */
  const MAIN_BUTTON = 0;

  /** The frame the running gesture changes: the one active when its first pointer went down. */
  let gestureKey: FrameKey = FRAME_KEYS[0];
  /** Where a mouse click would pick the other frame, the cursor says so. */
  let picksFrame = $state(false);

  /** The frame a tap at the event's point picks, or null. */
  function tapped(event: PointerEvent): FrameKey | null {
    const box = pictureElement?.getBoundingClientRect();
    if (box === undefined || box.width === 0 || box.height === 0) {
      return null;
    }
    const point = {
      x: (event.clientX - box.left) / box.width,
      y: (event.clientY - box.top) / box.height,
    };
    const rects = { from: frameRect(motion.from, size), to: frameRect(motion.to, size) };
    const tolerance = { x: TAP_TOLERANCE_PX / box.width, y: TAP_TOLERANCE_PX / box.height };
    return tappedFrame(point, rects, active, tolerance);
  }

  function pointerDown(event: PointerEvent): void {
    // A mouse's other buttons open menus or scroll; only the main one edits. Touch and pen
    // report their contact as the main button too.
    if (event.pointerType === "mouse" && event.button !== MAIN_BUTTON) {
      return;
    }
    const target = event.target as Element;
    const corner = target.closest<HTMLElement>("[data-corner]")?.dataset["corner"] as
      Corner | undefined;
    if (gesture.idle) {
      gestureKey = active;
    }
    const point = { x: event.clientX, y: event.clientY };
    const on =
      corner === undefined ? { kind: "picture" as const } : { kind: "corner" as const, corner };
    if (gesture.down(event.pointerId, point, on, motion[gestureKey])) {
      event.preventDefault();
    }
  }

  function pointerMove(event: PointerEvent): void {
    if (pictureElement === undefined) {
      return;
    }
    const point = { x: event.clientX, y: event.clientY };
    const framing = gesture.move(event.pointerId, point, pictureElement.getBoundingClientRect());
    if (framing !== null) {
      onFraming(gestureKey, framing, false);
    }
  }

  function pointerUp(event: PointerEvent): void {
    const end = gesture.up(event.pointerId);
    if (end.kind === "framing") {
      onFraming(gestureKey, end.framing, true);
    } else if (end.kind === "tap") {
      const picked = tapped(event);
      if (picked !== null && picked !== active) {
        onActivate(picked);
      }
    }
  }

  /** A cancelled pointer is no tap; a drag it was part of still keeps what it reached. */
  function pointerCancel(event: PointerEvent): void {
    const end = gesture.up(event.pointerId);
    if (end.kind === "framing") {
      onFraming(gestureKey, end.framing, true);
    }
  }

  function hover(event: PointerEvent): void {
    const picked = event.pointerType === "mouse" && gesture.idle ? tapped(event) : null;
    picksFrame = picked !== null && picked !== active;
  }

  function keydown(event: KeyboardEvent): void {
    const changed = framingForKey(motion[active], event.key, event.shiftKey, size);
    if (changed !== null) {
      event.preventDefault();
      onFraming(active, changed, true);
    }
  }

  /** A wheel listener must not be passive: the wheel zooms instead of scrolling the page. */
  function wheelZoom(element: HTMLElement) {
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      onFraming(active, wheelZoomedFraming(motion[active], event.deltaY, size), true);
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return { destroy: () => element.removeEventListener("wheel", wheel) };
  }

  const path = $derived({ from: centre(motion.from), to: centre(motion.to) });
</script>

<svelte:window
  onpointermove={pointerMove}
  onpointerup={pointerUp}
  onpointercancel={pointerCancel}
/>

<div class="well" style:--picture-aspect={aspect}>
  <div class="fit" bind:clientWidth={fitWidth} bind:clientHeight={fitHeight}>
    <!-- Pointer gestures on the picture; the keyboard works on the focused frame instead. -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="pic"
      bind:this={pictureElement}
      style:width="{shownWidth}px"
      style:height="{shownWidth / aspect}px"
      class:picks-frame={picksFrame}
      onpointerdown={pointerDown}
      onpointermove={hover}
      use:wheelZoom
    >
      {#if pictureUrl !== null}
        <img src={pictureUrl} {alt} draggable="false" />
      {/if}
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
          onKeydown={keydown}
        />
      {/each}
      <svg class="path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <line x1={path.from.x} y1={path.from.y} x2={path.to.x} y2={path.to.y} />
      </svg>
      {#if playhead !== null}
        <div class="playhead" style={rectStyle(playhead)} aria-hidden="true"></div>
      {/if}
      <FocusMarker indication={focus} {reducedMotion} />
    </div>
  </div>
</div>

<style>
  .well {
    position: relative;
    --well-margin: var(--gl-editor-well-margin);
    min-height: 0;
    padding: var(--well-margin);
    border-radius: var(--gl-radius-large);
    background: var(--gl-editor-well);
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }
  .fit {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
  }
  /* Not clipped: the active frame's handles reach past the picture's edges. */
  .pic {
    position: relative;
    cursor: move;
  }
  .pic.picks-frame {
    cursor: pointer;
  }
  .pic img {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
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
  @media (pointer: coarse) {
    .well {
      --well-margin: var(--gl-editor-well-margin-coarse);
    }
  }
  @container (max-width: 720px) {
    /* As high as the picture at full width, up to a cap; a tall picture keeps the full width. */
    .well {
      width: 100%;
      aspect-ratio: var(--picture-aspect);
      max-height: var(--gl-editor-well-max-height);
      border-radius: 0;
    }
  }
</style>
