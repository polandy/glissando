<script lang="ts">
  import type { IconName } from "../../../ui-kit/icons";
  import Icon from "../../components/Icon.svelte";

  /**
   * One of the selection bar's actions (REMOVE_SELECT_REORDER.md, Select and reorder): the icon over
   * its short label on a narrow screen, beside it on a wide one. `name` is the accessible name when
   * it says more than the label.
   */
  let {
    icon,
    label,
    name = label,
    danger = false,
    disabledLook = false,
    menuOpen,
    element = $bindable(),
    onclick,
  }: {
    icon: IconName;
    label: string;
    name?: string;
    /** Remove: the icon and label in the danger colour. */
    danger?: boolean;
    /** Looks off but still answers a tap, and keeps its place in the tab order. */
    disabledLook?: boolean;
    /** Set for the button that opens a menu: whether that menu is open. */
    menuOpen?: boolean;
    element?: HTMLButtonElement | undefined;
    onclick: () => void;
  } = $props();
</script>

<button
  bind:this={element}
  class="btn action"
  class:danger
  type="button"
  aria-label={name}
  aria-disabled={disabledLook}
  aria-haspopup={menuOpen === undefined ? undefined : "menu"}
  aria-expanded={menuOpen}
  {onclick}
>
  <Icon name={icon} />
  <span class="label">{label}</span>
</button>

<style>
  .action {
    flex-direction: column;
    gap: 3px;
    min-width: 56px;
    height: 56px;
    padding: 0 6px;
    border-color: transparent;
    background: transparent;
    color: inherit;
    font-size: var(--gl-size-caption);
    font-weight: var(--gl-weight-medium);
    white-space: nowrap;
    user-select: none;
  }
  .danger {
    color: var(--gl-inverse-danger);
  }
  /* A touch screen keeps the last tapped button "hovered": highlight for a mouse only. */
  @media (hover: hover) {
    .action:hover:not([aria-disabled="true"]) {
      background: var(--gl-inverse-hover);
    }
    .danger:hover:not([aria-disabled="true"]) {
      background: color-mix(in srgb, var(--gl-inverse-danger) 30%, var(--gl-inverse-bg));
    }
  }
  /* Wide: the label moves beside the icon (the same breakpoint as the bar's). */
  @container (width >= 1140px) {
    .action {
      flex-direction: row;
      gap: 7px;
      min-width: 0;
      height: 44px;
      padding: 0 12px;
      font-size: var(--gl-size-label);
    }
  }
</style>
