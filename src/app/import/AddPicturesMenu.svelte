<script lang="ts">
  import { tick } from "svelte";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";

  /**
   * The "Add pictures" menu, picking up where the empty step's drop zone left off: files, a
   * folder, and, where Immich can be opened, "From Immich" (IMPORT_WIZARD.md, Pictures). Two
   * triggers share it: the strip head's small button and the strip's own dashed add tile.
   */
  let {
    onAddMore,
    onOpenImmich,
    tile = false,
  }: {
    /** Null where no pictures come from the device, as for a server slideshow. */
    onAddMore: { readonly onPickFiles: () => void; readonly onPickFolder: () => void } | null;
    /** Null where Immich cannot be opened. */
    onOpenImmich: (() => void) | null;
    /** The dashed add-tile presentation instead of the small head button. */
    tile?: boolean;
  } = $props();

  const { t } = getTranslator();
  let open = $state(false);
  let toggle: HTMLButtonElement | undefined = $state();

  async function close(): Promise<void> {
    open = false;
    await tick();
    toggle?.focus();
  }

  function keydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      void close();
    }
  }

  function choose(action: () => void): void {
    open = false;
    action();
  }

  /**
   * Focuses the first item and, fixed to the viewport, keeps the popover clear of its right
   * edge — the strip would otherwise clip it, and the trigger can sit close to a phone's edge.
   * A trigger in the lower half opens it upwards, clear of the step's bottom bar.
   */
  function openMenu(menu: HTMLElement): void {
    menu.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const anchor = toggle?.getBoundingClientRect();
    if (anchor === undefined) {
      return;
    }
    const margin = 8;
    const left = Math.min(anchor.left, window.innerWidth - menu.offsetWidth - margin);
    menu.style.left = `${Math.max(margin, left)}px`;
    const gap = 6;
    const opensUp = anchor.top + anchor.height / 2 > window.innerHeight / 2;
    const top = opensUp ? anchor.top - gap - menu.offsetHeight : anchor.bottom + gap;
    menu.style.top = `${Math.max(margin, top)}px`;
  }
</script>

{#snippet popover()}
  {#if open}
    <button
      class="scrim"
      type="button"
      tabindex="-1"
      aria-hidden="true"
      onclick={() => void close()}
    ></button>
    <div class="menu" role="menu" tabindex="-1" use:openMenu onkeydown={keydown}>
      {#if onAddMore !== null}
        <button
          class="item"
          type="button"
          role="menuitem"
          onclick={() => choose(onAddMore.onPickFiles)}
        >
          <Icon name="files" />{t("import.addPicturesAndVideos")}
        </button>
        <button
          class="item"
          type="button"
          role="menuitem"
          onclick={() => choose(onAddMore.onPickFolder)}
        >
          <Icon name="folder" />{t("import.addFolder")}
        </button>
      {/if}
      {#if onOpenImmich !== null}
        <button class="item" type="button" role="menuitem" onclick={() => choose(onOpenImmich)}>
          <Icon name="cloud" />{t("immich.more")}
        </button>
      {/if}
    </div>
  {/if}
{/snippet}

<!-- A single root per variant: the tile must be the strip's only `<li>` child, popover included. -->
{#if tile}
  <li class="tile">
    <button
      class="add-tile"
      type="button"
      bind:this={toggle}
      aria-label={t("import.addMore")}
      aria-haspopup="menu"
      aria-expanded={open}
      onclick={() => (open = !open)}
    >
      <Icon name="plus" />
      <span class="label mono">{t("add.titleShort")}</span>
    </button>
    {@render popover()}
  </li>
{:else}
  <span class="add-pictures">
    <button
      class="btn small"
      type="button"
      bind:this={toggle}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={t("import.addMore")}
      onclick={() => (open = !open)}
    >
      <Icon name="plus" /><span class="wide">{t("import.addMore")}</span><span class="narrow"
        >{t("add.titleShort")}</span
      >
    </button>
    {@render popover()}
  </span>
{/if}

<style>
  /* Wraps the head button and its popover without adding a box of its own to the grid cell. */
  .add-pictures {
    display: contents;
  }
  .tile {
    position: relative;
    aspect-ratio: 4 / 3;
  }
  .add-tile {
    position: absolute;
    inset: 0;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 6px;
    padding: 0;
    border: 1.5px dashed var(--gl-line);
    border-radius: var(--gl-radius-tile);
    background: transparent;
    color: var(--gl-muted);
    cursor: pointer;
  }
  .add-tile:hover {
    background: var(--gl-hover);
  }
  .add-tile:focus-visible {
    outline: 3px solid var(--gl-accent);
    outline-offset: 2px;
  }
  .label {
    padding: 1px 6px;
    font-size: var(--gl-size-caption);
  }
  .narrow {
    display: none;
  }
  @container (max-width: 720px) {
    .wide {
      display: none;
    }
    .narrow {
      display: inline;
    }
  }
  /* Catches the click outside the menu that closes it. */
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 4;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: default;
  }
  .menu {
    position: fixed;
    z-index: 5;
    display: grid;
    min-width: 180px;
    padding: 6px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
    box-shadow: var(--gl-shadow);
  }
  .item {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 10px;
    border: 0;
    border-radius: var(--gl-radius-tile);
    background: transparent;
    color: var(--gl-ink);
    font-size: var(--gl-size-body);
    text-align: left;
    cursor: pointer;
  }
  .item:hover {
    background: var(--gl-hover);
  }
</style>
