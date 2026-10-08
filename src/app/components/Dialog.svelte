<script lang="ts" module>
  export interface DialogAction {
    readonly label: string;
    /** Plain outline by default; `danger` for the irreversible choice. */
    readonly tone?: "default" | "mint" | "danger";
    readonly onSelect: () => void;
  }
</script>

<script lang="ts">
  import { onMount } from "svelte";

  /** Only when the user must decide or would otherwise lose data (dev-docs/APP.md). */
  let {
    title,
    message,
    actions,
    onCancel,
  }: {
    title: string;
    message: string;
    actions: readonly DialogAction[];
    /** Esc; without it the dialog cannot be dismissed, only answered. */
    onCancel?: () => void;
  } = $props();

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
  <p>{message}</p>
  <div class="actions">
    {#each actions as action (action.label)}
      <button
        class="btn"
        class:mint={action.tone === "mint"}
        class:danger={action.tone === "danger"}
        type="button"
        onclick={action.onSelect}
      >
        {action.label}
      </button>
    {/each}
  </div>
</dialog>

<style>
  dialog {
    width: calc(100% - 40px);
    max-width: 380px;
    padding: 22px;
    border: 0;
    border-radius: var(--gl-radius);
    background: var(--gl-surface);
    color: var(--gl-text);
    box-shadow: var(--gl-shadow);
  }
  dialog::backdrop {
    background: var(--gl-scrim);
  }
  h3 {
    margin: 0 0 8px;
    font-weight: var(--gl-weight-heading);
    font-size: var(--gl-size-title);
  }
  p {
    margin: 6px 0;
    line-height: 1.4;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 16px;
  }
</style>
