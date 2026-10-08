<script lang="ts">
  import type { OwnKenBurns } from "../../library/own-ken-burns";
  import type { Framing, Size } from "../../player";
  import {
    frameRect,
    frameStyle,
    framingForKey,
    wheelZoomedFraming,
    type Corner,
  } from "./frame-geometry";
  import { FrameGesture, type GestureTarget } from "./frame-gesture";
  import { FRAME_KEYS, type FrameKey } from "./frame-keys";
  import PictureFrame from "./PictureFrame.svelte";

  /**
   * The picture with the motion's two frames on it. The active frame moves by drag, resizes by
   * its corners, zooms by wheel, pinch and + / −, and moves by arrow keys; it never leaves the
   * picture.
   */
  let {
    size,
    pictureUrl,
    alt,
    motion,
    active,
    playhead,
    onActivate,
    onFraming,
  }: {
    size: Size;
    pictureUrl: string | null;
    alt: string;
    motion: OwnKenBurns;
    active: FrameKey;
    /** Where the playing preview is, outlined on the picture; null while it is paused. */
    playhead: Framing | null;
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

  function pointerDown(event: PointerEvent): void {
    const target = event.target as Element;
    const corner = target.closest<HTMLElement>("[data-corner]")?.dataset["corner"] as
      Corner | undefined;
    const on: GestureTarget =
      corner !== undefined
        ? { kind: "corner", corner }
        : target.closest(".frame.active") !== null
          ? { kind: "frame" }
          : { kind: "other" };
    const point = { x: event.clientX, y: event.clientY };
    if (gesture.down(event.pointerId, point, on, motion[active])) {
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
      onFraming(active, framing, false);
    }
  }

  function pointerEnd(event: PointerEvent): void {
    const done = gesture.up(event.pointerId);
    if (done !== null) {
      onFraming(active, done, true);
    }
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

<svelte:window onpointermove={pointerMove} onpointerup={pointerEnd} onpointercancel={pointerEnd} />

<div class="well" style:--picture-aspect={aspect}>
  <div class="fit" bind:clientWidth={fitWidth} bind:clientHeight={fitHeight}>
    <!-- Pointer gestures on the picture; the keyboard works on the focused frame instead. -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="pic"
      bind:this={pictureElement}
      style:width="{shownWidth}px"
      style:height="{shownWidth / aspect}px"
      onpointerdown={pointerDown}
      use:wheelZoom
    >
      {#if pictureUrl !== null}
        <img src={pictureUrl} {alt} draggable="false" />
      {/if}
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
        <div class="playhead" style={frameStyle(playhead, size)} aria-hidden="true"></div>
      {/if}
    </div>
  </div>
</div>

<style>
  .well {
    position: relative;
    min-height: 0;
    padding: 20px;
    overflow: hidden;
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
  .pic {
    position: relative;
    overflow: hidden;
  }
  .pic img {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    pointer-events: none;
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
  @container (max-width: 720px) {
    /* As high as the picture at full width, up to a cap. */
    .well {
      aspect-ratio: var(--picture-aspect);
      max-height: 440px;
      padding: 0;
      border-radius: 0;
    }
  }
</style>
