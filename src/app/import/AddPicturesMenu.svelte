<script lang="ts">
  import { tick } from "svelte";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";

  /**
   * The "Add pictures" button above the strip, picking up where the empty step's drop zone left
   * off: a small menu offering files or a folder (IMPORT_WIZARD.md, Pictures).
   */
  let { onPickFiles, onPickFolder }: { onPickFiles: () => void; onPickFolder: () => void } =
    $props();

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

  function focusFirstItem(menu: HTMLElement): void {
    menu.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }
</script>

<div class="add-pictures">
  <button
    class="btn ghost"
    type="button"
    aria-haspopup="menu"
    aria-expanded={open}
    bind:this={toggle}
    onclick={() => (open = !open)}
  >
    <Icon name="plus" />{t("import.addMore")}
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
      <button class="item" type="button" role="menuitem" onclick={() => choose(onPickFiles)}>
        {t("import.pickPictures")}
      </button>
      <button class="item" type="button" role="menuitem" onclick={() => choose(onPickFolder)}>
        {t("import.pickFolder")}
      </button>
    </div>
  {/if}
</div>

<style>
  .add-pictures {
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
    top: calc(100% + 6px);
    left: 0;
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
