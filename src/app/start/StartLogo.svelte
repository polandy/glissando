<script lang="ts">
  import logoMarkup from "../../../assets/brand/logo-stacked-animated.svg?raw";

  type Phase = "playing" | "settled";

  let { play }: { play: boolean } = $props();

  let host: HTMLElement;
  let animationsEnded = $state(false);
  const phase: Phase = $derived(play && !animationsEnded ? "playing" : "settled");

  // The settled phase is the animation's completion signal (data-phase): it follows the
  // animations' own end, whether they ran out or a tap finished them early.
  $effect(() => {
    if (phase !== "playing") {
      return;
    }
    const animations = host.getAnimations({ subtree: true });
    void Promise.all(animations.map((animation) => animation.finished)).then(() => {
      animationsEnded = true;
    });
  });

  function skip(): void {
    for (const animation of host.getAnimations({ subtree: true })) {
      animation.finish();
    }
  }
</script>

<svelte:window onpointerdown={phase === "playing" ? skip : undefined} />

<div bind:this={host} class="start-logo" class:playing={phase === "playing"} data-phase={phase}>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- build-generated brand asset, no user input -->
  {@html logoMarkup}
</div>

<style>
  .start-logo :global(svg) {
    display: block;
    width: min(80vw, 400px);
    height: auto;
    overflow: visible;
  }

  .start-logo :global(:is(.card, .motif, .wordmark)) {
    transform-box: fill-box;
    transform-origin: center;
  }

  .playing :global(:is(.card, .motif, .wordmark)) {
    animation-duration: var(--duration);
    animation-delay: var(--delay, 0ms);
    animation-fill-mode: both;
    animation-timing-function: cubic-bezier(0.2, 0.85, 0.3, 1.15);
  }

  .playing :global(.card) {
    --duration: 600ms;
    animation-name: glide-in;
  }
  .playing :global(.card-middle) {
    --delay: 120ms;
  }
  .playing :global(.card-front) {
    --delay: 240ms;
  }
  .playing :global(.motif) {
    --delay: 620ms;
    --duration: 420ms;
    animation-name: pop-in;
  }
  .playing :global(.wordmark) {
    --delay: 700ms;
    --duration: 700ms;
    animation-name: reveal;
    animation-timing-function: cubic-bezier(0.3, 0.7, 0.2, 1);
  }

  @media (prefers-reduced-motion: reduce) {
    .playing :global(:is(.card, .motif, .wordmark)) {
      --delay: 0ms;
      --duration: 400ms;
      animation-name: fade-in;
    }
  }

  @keyframes glide-in {
    from {
      opacity: 0;
      transform: translateX(-70px) rotate(-18deg);
    }
  }
  @keyframes pop-in {
    from {
      opacity: 0;
      transform: scale(0.4);
    }
  }
  @keyframes reveal {
    from {
      clip-path: inset(0 100% 0 0);
      transform: translateX(-12px);
    }
    /* Explicit: inset() does not interpolate to the implicit "none". */
    to {
      clip-path: inset(0);
    }
  }
  @keyframes fade-in {
    from {
      opacity: 0;
    }
  }
</style>
