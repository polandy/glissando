<script lang="ts">
  import { tick } from "svelte";
  import Icon from "../../components/Icon.svelte";
  import { getTranslator } from "../../i18n/context";
  import BarAction from "./BarAction.svelte";
  import type { BarItem } from "./SelectionBarItem";

  /**
   * "More" and its menu above the bar (REMOVE_SELECT_REORDER.md, Select and reorder): the moves
   * and extras that do not fit a narrow screen's bar. Closes on a tap outside, Esc and a choice;
   * Esc and a choice return focus to "More".
   */
  let { items }: { items: readonly BarItem[] } = $props();

  const { t } = getTranslator();
  let open = $state(false);
  let toggle = $state<HTMLButtonElement>();
  let menu = $state<HTMLElement>();

  function menuItems(): HTMLElement[] {
    return [...(menu?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
  }

  async function show(): Promise<void> {
    open = true;
    await tick();
    menuItems()[0]?.focus();
  }

  async function close(): Promise<void> {
    open = false;
    await tick();
    toggle?.focus();
  }

  function choose(item: BarItem): void {
    if (item.disabled) {
      return;
    }
    open = false;
    // Before the run, so a sheet it opens takes focus from "More" and gives it back on closing.
    toggle?.focus();
    item.run();
  }

  function keydown(event: KeyboardEvent): void {
    const buttons = menuItems();
    const at = buttons.indexOf(document.activeElement as HTMLElement);
    const targets: Record<string, number> = {
      ArrowDown: (at + 1) % buttons.length,
      ArrowUp: (at - 1 + buttons.length) % buttons.length,
      Home: 0,
      End: buttons.length - 1,
    };
    if (event.key === "Escape") {
      event.preventDefault();
      void close();
    } else if (event.key in targets) {
      event.preventDefault();
      buttons[targets[event.key] as number]?.focus();
    }
  }

  function outside(event: PointerEvent): void {
    const inside =
      event.target instanceof Node &&
      (menu?.contains(event.target) || toggle?.contains(event.target));
    if (open && !inside) {
      open = false;
    }
  }
</script>

<svelte:window onpointerdown={outside} />

<div class="more">
  <BarAction
    icon="more"
    label={t("slideshow.more")}
    name={t("slideshow.moreActions")}
    menuOpen={open}
    bind:element={toggle}
    onclick={() => (open ? void close() : void show())}
  />
  {#if open}
    <div class="menu" role="menu" tabindex="-1" bind:this={menu} onkeydown={keydown}>
      {#each items as item (item.key)}
        <button
          class="item"
          type="button"
          role="menuitem"
          aria-disabled={item.disabled}
          onclick={() => choose(item)}
        >
          <Icon name={item.icon} />{item.label}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .more {
    display: contents;
  }
  /* Opens above the bar, in the screen's own colours so it reads apart from the inverse bar. */
  .menu {
    position: absolute;
    right: 0;
    bottom: calc(100% + 8px);
    display: grid;
    width: min(260px, 100%);
    padding: 6px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
    box-shadow: var(--gl-shadow);
  }
  .item {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 48px;
    padding: 0 12px;
    border: 0;
    border-radius: var(--gl-radius);
    background: transparent;
    color: var(--gl-ink);
    font-size: var(--gl-size-body);
    text-align: left;
    cursor: pointer;
  }
  .item[aria-disabled="true"] {
    opacity: 0.35;
  }
  @media (hover: hover) {
    .item:hover:not([aria-disabled="true"]) {
      background: var(--gl-hover);
    }
  }
</style>
