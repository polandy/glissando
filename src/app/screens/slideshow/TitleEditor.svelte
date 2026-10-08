<script lang="ts">
  import { tick } from "svelte";
  import { MAX_TITLE_LENGTH } from "../../../library/slideshow-edits";
  import Icon from "../../components/Icon.svelte";
  import { getTranslator } from "../../i18n/context";

  /** The slideshow's title, renamed in place: Enter or leaving the field saves, Esc cancels. */
  let { title, onRename }: { title: string; onRename: (typed: string) => void } = $props();

  const { t } = getTranslator();

  let editing = $state(false);
  let renameButton = $state<HTMLButtonElement>();

  function startEditing(input: HTMLInputElement): void {
    input.focus();
    input.select();
  }

  async function finish(typed: string | null): Promise<void> {
    // Leaving the field after Enter or Esc must not save a second time.
    if (!editing) {
      return;
    }
    editing = false;
    if (typed !== null) {
      onRename(typed);
    }
    await tick();
    renameButton?.focus();
  }

  function keydown(event: KeyboardEvent): void {
    const input = event.currentTarget as HTMLInputElement;
    if (event.key === "Enter") {
      event.preventDefault();
      void finish(input.value);
    } else if (event.key === "Escape") {
      event.preventDefault();
      void finish(null);
    }
  }
</script>

{#if editing}
  <input
    class="title-input"
    value={title}
    maxlength={MAX_TITLE_LENGTH}
    aria-label={t("slideshow.titleInput")}
    use:startEditing
    onkeydown={keydown}
    onblur={(event) => void finish(event.currentTarget.value)}
  />
  <p class="hint">{t("slideshow.titleHint")}</p>
{:else}
  <div class="row">
    <h1 class="title">{title}</h1>
    <button
      class="icon-btn rename"
      type="button"
      title={t("slideshow.rename")}
      aria-label={t("slideshow.rename")}
      bind:this={renameButton}
      onclick={() => (editing = true)}
    >
      <Icon name="pencil" />
    </button>
  </div>
{/if}

<style>
  .row {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    margin-top: 4px;
  }
  .title {
    min-width: 0;
    font-size: var(--gl-size-panel-title);
    overflow-wrap: anywhere;
  }
  .rename {
    width: 32px;
    height: 32px;
    color: var(--gl-muted);
  }
  @media (hover: hover) {
    .rename:hover {
      color: var(--gl-ink);
    }
  }
  .title-input {
    width: 100%;
    margin-top: 4px;
    padding: 3px 8px;
    border: 1.5px solid var(--gl-accent);
    border-radius: var(--gl-radius-tile);
    outline: none;
    background: var(--gl-raised);
    color: var(--gl-ink);
    font-family: var(--gl-font-display);
    font-weight: var(--gl-weight-title);
    font-size: var(--gl-size-panel-title);
    letter-spacing: var(--gl-tracking-title);
  }
  .hint {
    margin: 6px 0 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
</style>
