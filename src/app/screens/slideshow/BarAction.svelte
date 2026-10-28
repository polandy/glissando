<script lang="ts" module>
  /** How long a finger rests on an icon before its bubble shows instead of the action. */
  export const BUBBLE_HOLD_MS = 450;
  /** How long a held bubble stays after the finger lifts, to be read. */
  export const BUBBLE_LINGER_MS = 900;
</script>

<script lang="ts">
  import type { Scheduler } from "../../../ui-kit/scheduler";
  import type { IconName } from "../../../ui-kit/icons";
  import Icon from "../../components/Icon.svelte";

  /**
   * One of the selection bar's actions as an icon whose words live in a bubble above it
   * (REMOVE_SELECT_REORDER.md, The selection bar): on hover or keyboard focus with a mouse, on a
   * press and hold with a finger, which then does not act. The words are its accessible name.
   */
  let {
    icon,
    label,
    danger = false,
    disabledLook = false,
    holdScheduler,
    onclick,
  }: {
    icon: IconName;
    label: string;
    /** Remove: the icon in the danger colour. */
    danger?: boolean;
    /** Looks off but still answers a tap, and keeps its place in the tab order. */
    disabledLook?: boolean;
    holdScheduler: Scheduler;
    onclick: () => void;
  } = $props();

  let held = $state(false);
  // A hold showed the bubble: the click that follows the lift is not an action.
  let swallowClick = false;
  let cancelTimer: (() => void) | null = null;

  function stopTimer(): void {
    cancelTimer?.();
    cancelTimer = null;
  }

  function pressed(event: PointerEvent): void {
    stopTimer();
    swallowClick = false;
    held = false;
    if (event.pointerType === "mouse") {
      return;
    }
    cancelTimer = holdScheduler.after(BUBBLE_HOLD_MS, () => {
      cancelTimer = null;
      held = true;
      swallowClick = true;
    });
  }

  function lifted(): void {
    stopTimer();
    if (held) {
      cancelTimer = holdScheduler.after(BUBBLE_LINGER_MS, () => {
        cancelTimer = null;
        held = false;
      });
    }
  }

  function clicked(): void {
    if (swallowClick) {
      swallowClick = false;
      return;
    }
    onclick();
  }

  $effect(() => stopTimer);
</script>

<button
  class="btn action"
  class:danger
  class:held
  type="button"
  aria-label={label}
  aria-disabled={disabledLook}
  onpointerdown={pressed}
  onpointerup={lifted}
  onpointercancel={lifted}
  oncontextmenu={(event) => event.preventDefault()}
  onclick={clicked}
>
  <Icon name={icon} />
  <span class="bubble" aria-hidden="true">{label}</span>
</button>

<style>
  .action {
    position: relative;
    height: 40px;
    padding: 0 10px;
    border-color: transparent;
    background: transparent;
    color: inherit;
    user-select: none;
    -webkit-touch-callout: none;
  }
  .danger :global(svg) {
    color: var(--gl-inverse-danger);
  }
  @media (hover: hover) {
    .action:hover:not([aria-disabled="true"]) {
      background: var(--gl-inverse-hover);
    }
    .danger:hover:not([aria-disabled="true"]) {
      background: color-mix(in srgb, var(--gl-inverse-danger) 30%, var(--gl-inverse-bg));
    }
  }
  /* Above the bar, in the screen's own colours, so it reads apart from the inverse bar. */
  .bubble {
    position: absolute;
    bottom: calc(100% + 14px);
    left: 50%;
    z-index: 1;
    padding: 6px 11px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
    background: var(--gl-surface);
    box-shadow: var(--gl-shadow);
    color: var(--gl-ink);
    font-size: var(--gl-size-label);
    font-weight: var(--gl-weight-medium);
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    translate: -50% 4px;
    transition:
      opacity 0.14s,
      translate 0.14s;
  }
  .bubble::after {
    position: absolute;
    top: 100%;
    left: 50%;
    width: 10px;
    height: 10px;
    margin: -5px 0 0 -5px;
    border: solid var(--gl-line);
    border-width: 0 1px 1px 0;
    background: var(--gl-surface);
    content: "";
    rotate: 45deg;
  }
  /* The bar's first icon sits near the screen's edge: its bubble opens to the right. */
  .action:first-of-type .bubble {
    left: 0;
    translate: 0 4px;
  }
  .action:first-of-type .bubble::after {
    left: 20px;
  }
  .held .bubble {
    opacity: 1;
    translate: -50% 0;
  }
  .held:first-of-type .bubble {
    translate: 0 0;
  }
  /* A mouse rests a moment before the words show, so passing over the bar shows none. */
  @media (hover: hover) {
    .action:hover .bubble,
    .action:focus-visible .bubble {
      opacity: 1;
      translate: -50% 0;
      transition-delay: 0.35s;
    }
    .action:first-of-type:hover .bubble,
    .action:first-of-type:focus-visible .bubble {
      translate: 0 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .bubble {
      transition: opacity 0.14s;
    }
  }
</style>
