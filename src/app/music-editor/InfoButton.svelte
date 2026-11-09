<script lang="ts">
  import type { Snippet } from "svelte";
  import Icon from "../components/Icon.svelte";

  /**
   * A small ⓘ button that opens the mechanics behind a control in a popover (the platform's
   * `popover`: a tap outside or Esc closes it). The popover is fixed under its button and kept
   * inside the viewport, which the section it sits in would otherwise clip.
   */
  let { label, children }: { label: string; children: Snippet } = $props();

  const id = $props.id();
  /** The popover's width, shrunk on a screen narrower than this plus its margins. */
  const WIDTH_PX = 288;
  const MARGIN_PX = 8;
  const GAP_PX = 6;

  let button: HTMLButtonElement | undefined = $state();

  function place(event: ToggleEvent): void {
    const popover = event.currentTarget;
    const anchor = button?.getBoundingClientRect();
    if (event.newState !== "open" || anchor === undefined || !(popover instanceof HTMLElement)) {
      return;
    }
    const width = Math.min(WIDTH_PX, window.innerWidth - 2 * MARGIN_PX);
    const left = Math.min(anchor.left, window.innerWidth - width - MARGIN_PX);
    const top = anchor.bottom + GAP_PX;
    popover.style.width = `${width}px`;
    popover.style.left = `${Math.max(MARGIN_PX, left)}px`;
    popover.style.top = `${top}px`;
    popover.style.maxHeight = `${window.innerHeight - top - MARGIN_PX}px`;
  }
</script>

<button bind:this={button} class="info" type="button" popovertarget={id} aria-label={label}>
  <Icon name="info" />
</button>
<div {id} class="pop" popover="auto" onbeforetoggle={place}>
  {@render children()}
</div>

<style>
  .info {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--gl-muted);
    cursor: pointer;
  }
  .info:hover {
    background: var(--gl-hover);
    color: var(--gl-ink);
  }
  .pop {
    position: fixed;
    inset: auto;
    margin: 0;
    padding: 12px 14px;
    overflow: auto;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
    color: var(--gl-ink);
    box-shadow: var(--gl-shadow);
    font-size: var(--gl-size-meta);
  }
  .pop :global(p) {
    margin: 0;
  }
  .pop :global(p + p) {
    margin-top: 8px;
  }
  @media (pointer: coarse) {
    .info {
      width: var(--gl-hit-min);
      height: var(--gl-hit-min);
      /* A square hit area: the probes at its corners must land on it. */
      border-radius: 0;
    }
  }
</style>
