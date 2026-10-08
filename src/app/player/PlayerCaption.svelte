<script lang="ts">
  import { onMount } from "svelte";
  import { MediaQuery } from "svelte/reactivity";
  import { REDUCED_MOTION_QUERY } from "../reduced-motion";
  import type { Scheduler } from "../scheduler";
  import { captionInset, captionInsetMotion } from "./caption-inset";

  /** What the caption needs from the player: where captions sit above the bottom edge. */
  interface CaptionInsetTarget {
    /** Glides there. */
    captionInset: number;
    jumpCaptionInset(cssPixels: number): void;
  }

  /**
   * The current slide's caption for the player overlay: tells screen readers the caption (it is
   * drawn into the picture) and keeps the drawn caption above the bottom controls while they
   * show and above the screen's safe area always.
   */
  let {
    player,
    caption,
    controlsVisible,
    bottomBar,
    bottomBarHeight,
    scheduler,
  }: {
    player: CaptionInsetTarget | null;
    caption: string;
    controlsVisible: boolean;
    bottomBar: HTMLElement | undefined;
    /** The bar's height; it pads itself by the safe area, so it changes with it. */
    bottomBarHeight: number;
    scheduler: Scheduler;
  } = $props();

  const reducedMotion = new MediaQuery(REDUCED_MOTION_QUERY);
  /** The player whose caption inset is placed; a new player gets its first inset at once. */
  let insetPlayer: CaptionInsetTarget | null = null;
  let safeAreaProbe: HTMLElement;
  /** Live regions announce changes, not what they hold when they appear: filled after mount. */
  let announcing = $state(false);

  onMount(() => scheduler.after(0, () => (announcing = true)));

  // Captions glide up above the bottom controls while they show.
  $effect(() => {
    if (player === null || bottomBar === undefined) {
      return;
    }
    const inset = captionInset(
      controlsVisible,
      { height: bottomBarHeight, fadeHeight: parseFloat(getComputedStyle(bottomBar).paddingTop) },
      safeAreaProbe.offsetHeight,
    );
    const motion = captionInsetMotion({
      firstPlacement: player !== insetPlayer,
      reducedMotion: reducedMotion.current,
    });
    insetPlayer = player;
    if (motion === "jump") {
      player.jumpCaptionInset(inset);
    } else {
      player.captionInset = inset;
    }
  });
</script>

<!-- The caption is drawn into the picture; screen readers hear it from here. -->
<p class="caption-text" aria-live="polite">{announcing ? caption : ""}</p>
<div bind:this={safeAreaProbe} class="safe-area-probe" aria-hidden="true"></div>

<style>
  .caption-text,
  .safe-area-probe {
    position: absolute;
    width: 1px;
    margin: 0;
    overflow: hidden;
    clip-path: inset(50%);
    pointer-events: none;
  }
  .caption-text {
    height: 1px;
  }
  .safe-area-probe {
    bottom: 0;
    height: env(safe-area-inset-bottom, 0px);
    visibility: hidden;
  }
</style>
