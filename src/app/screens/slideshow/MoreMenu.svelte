<script lang="ts">
  import { tick } from "svelte";
  import Icon from "../../components/Icon.svelte";
  import { getTranslator } from "../../i18n/context";
  import type { SlideshowStorage, StorageAction } from "../view-models";

  /** The header's ⋯ button and its menu: focus, storage and delete. */
  let {
    onDelete,
    storage = null,
    pictureCount,
    onStorageAction,
    focusFailed,
    onFocus,
  }: {
    onDelete: () => void;
    /** Where the slideshow lives; null while the server library is off. */
    storage?: SlideshowStorage | null;
    pictureCount: number;
    onStorageAction: (action: StorageAction) => void;
    /** Pictures the finished focus search couldn't look at; 0 shows no hint line (ADR-0041). */
    focusFailed: number;
    /** Opens the Focus sheet. */
    onFocus: () => void;
  } = $props();

  const onServer = $derived(storage?.kind === "server");

  const { t } = getTranslator();

  let open = $state(false);
  let toggle = $state<HTMLButtonElement>();

  /** Back to the ⋯ button, e.g. once the dialog an item opened is answered. */
  export function focus(): void {
    toggle?.focus();
  }

  function focusFirstItem(menu: HTMLElement): void {
    menu.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }

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

  function toggleMenu(): void {
    open = !open;
  }

  function choose(action: () => void): void {
    open = false;
    action();
  }
</script>

<div class="more">
  <button
    class="icon-btn"
    type="button"
    title={t("slideshow.more")}
    aria-label={t("slideshow.more")}
    aria-haspopup="menu"
    aria-expanded={open}
    bind:this={toggle}
    onclick={toggleMenu}
  >
    <Icon name="more" />
  </button>
  {#if open}
    <button
      class="scrim"
      type="button"
      tabindex="-1"
      aria-hidden="true"
      onclick={() => void close()}
    ></button>
    <div class="menu" role="menu" tabindex="-1" use:focusFirstItem onkeydown={keydown}>
      <button
        class="item"
        class:two-line={focusFailed > 0}
        type="button"
        role="menuitem"
        onclick={() => choose(onFocus)}
      >
        <Icon name="search" />
        <span class="text">
          {t("slideshow.focus")}
          {#if focusFailed > 0}
            <small>{t("slideshow.focusFailedHint", { count: focusFailed })}</small>
          {/if}
        </span>
      </button>
      <hr />
      {#if storage?.kind === "server"}
        <button
          class="item two-line"
          type="button"
          role="menuitem"
          onclick={() => choose(() => onStorageAction("keepCopy"))}
        >
          <Icon name="download" />
          <span class="text">
            {t("server.keepCopy")}
            <small>{t("server.keepCopyHint", { count: pictureCount })}</small>
          </span>
        </button>
      {:else if storage?.kind === "device"}
        <button
          class="item two-line"
          type="button"
          role="menuitem"
          onclick={() => choose(() => onStorageAction("saveOnServer"))}
        >
          <Icon name="upload" />
          <span class="text">
            {t("server.saveOnServer")}
            <small>{t("server.saveOnServerHint")}</small>
          </span>
        </button>
      {/if}
      <hr />
      <button
        class="item danger"
        class:two-line={onServer}
        type="button"
        role="menuitem"
        onclick={() => choose(onDelete)}
      >
        <Icon name="trash" />
        {#if onServer}
          <span class="text">
            {t("slideshow.delete")}<small>{t("server.deleteHint")}</small>
          </span>
        {:else}
          {t("slideshow.delete")}
        {/if}
      </button>
    </div>
  {/if}
</div>

<style>
  .more {
    position: relative;
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
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 5;
    display: grid;
    min-width: 220px;
    padding: 6px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
    box-shadow: var(--gl-shadow);
  }
  .item {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 40px;
    padding: 0 10px;
    border: 0;
    border-radius: var(--gl-radius-tile);
    background: transparent;
    color: var(--gl-ink);
    font-size: var(--gl-size-body);
    text-align: left;
    white-space: nowrap;
    cursor: pointer;
  }
  .item:hover {
    background: var(--gl-hover);
  }
  .two-line {
    height: auto;
    min-height: 40px;
    padding: 8px 10px;
  }
  .text {
    display: grid;
    gap: 2px;
  }
  small {
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
  hr {
    width: 100%;
    margin: 4px 0;
    border: 0;
    border-top: 1px solid var(--gl-line);
  }
  .item.danger {
    color: var(--gl-danger-text);
  }
</style>
