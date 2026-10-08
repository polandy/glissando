<script lang="ts" module>
  import type { IconName } from "../icons";

  export interface DialogAction {
    readonly label: string;
    /**
     * Plain outline by default; `primary` for the expected answer, `danger` for the irreversible
     * one, `ghost` for the dismissal next to a better answer.
     */
    readonly tone?: "default" | "primary" | "danger" | "ghost";
    readonly icon?: IconName;
    readonly onSelect: () => void;
  }
</script>

<script lang="ts">
  import { onMount, type Snippet } from "svelte";
  import Icon from "./Icon.svelte";

  /** Only when the user must decide or would otherwise lose data (dev-docs/APP.md). */
  let {
    title,
    message,
    actions,
    onCancel,
    children,
  }: {
    title: string;
    /** One paragraph each. */
    message: string | readonly string[];
    actions: readonly DialogAction[];
    /** Esc; without it the dialog cannot be dismissed, only answered. */
    onCancel?: () => void;
    /** Shown before the message, e.g. a list of steps. */
    children?: Snippet;
  } = $props();

  const paragraphs = $derived(typeof message === "string" ? [message] : message);

  let dialog: HTMLDialogElement;

  // The native modal dialog traps focus and makes the page behind it inert.
  onMount(() => {
    dialog.showModal();
    return () => dialog.close();
  });

  function cancel(event: Event): void {
    event.preventDefault();
    onCancel?.();
  }
</script>

<dialog bind:this={dialog} aria-labelledby="dialog-title" oncancel={cancel}>
  <h3 id="dialog-title">{title}</h3>
  {@render children?.()}
  {#each paragraphs as paragraph (paragraph)}
    <p>{paragraph}</p>
  {/each}
  <div class="actions">
    {#each actions as action (action.label)}
      <button
        class="btn"
        class:primary={action.tone === "primary"}
        class:danger={action.tone === "danger"}
        class:ghost={action.tone === "ghost"}
        type="button"
        onclick={action.onSelect}
      >
        {#if action.icon !== undefined}<Icon name={action.icon} />{/if}
        {action.label}
      </button>
    {/each}
  </div>
</dialog>

<style>
  dialog {
    width: calc(100% - 40px);
    max-width: 400px;
    padding: 20px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
    color: var(--gl-ink);
    box-shadow: var(--gl-shadow);
  }
  dialog::backdrop {
    background: var(--gl-backdrop);
  }
  h3 {
    margin: 0 0 8px;
    font-family: var(--gl-font-display);
    font-weight: var(--gl-weight-title);
    font-size: var(--gl-size-name);
    letter-spacing: var(--gl-tracking-title);
  }
  p {
    margin: 6px 0;
    color: var(--gl-muted);
    line-height: 1.5;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 18px;
  }
</style>
