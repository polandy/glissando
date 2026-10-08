<script lang="ts">
  import { tick } from "svelte";
  import Icon from "../../components/Icon.svelte";
  import type { ExportMenuState } from "../../glissando-file/export-menu";
  import { getTranslator } from "../../i18n/context";

  /** The header's ⋯ button and its menu of the slideshow's rarer actions. */
  let {
    exportState,
    onExport,
    onOpened,
    onDelete,
  }: {
    exportState: ExportMenuState;
    onExport: () => void;
    /** The menu opened: the export's size is due. */
    onOpened: () => void;
    onDelete: () => void;
  } = $props();

  const PERCENT = 100;
  const { t, formatBytes } = getTranslator();

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
    if (open) {
      onOpened();
    }
  }

  function exportChosen(): void {
    if (exportState.kind === "idle") {
      choose(onExport);
    }
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
        class="item two-line"
        type="button"
        role="menuitem"
        aria-disabled={exportState.kind !== "idle"}
        onclick={exportChosen}
      >
        <Icon name="download" />
        <span class="text">
          {#if exportState.kind === "this"}
            {t("glissandoFile.exportRunning", {
              percent: Math.round(exportState.fraction * PERCENT),
            })}
          {:else}
            {t("glissandoFile.export")}
          {/if}
          <small>
            {#if exportState.kind === "other"}
              {t("glissandoFile.exportAfterRunning")}
            {:else if exportState.kind === "idle" && exportState.sizeBytes !== null}
              {t("glissandoFile.exportSize", { size: formatBytes(exportState.sizeBytes) })}
            {:else}
              {t("glissandoFile.exportSizeUnknown")}
            {/if}
          </small>
        </span>
      </button>
      <hr />
      <button class="item danger" type="button" role="menuitem" onclick={() => choose(onDelete)}>
        <Icon name="trash" />{t("slideshow.delete")}
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
  .item[aria-disabled="true"] {
    color: var(--gl-muted);
    cursor: default;
  }
  .item[aria-disabled="true"]:hover {
    background: transparent;
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
