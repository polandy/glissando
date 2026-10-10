<script lang="ts">
  import { onMount, type Snippet } from "svelte";
  import Icon from "../../../components/Icon.svelte";

  /**
   * The export sheets' frame (VIDEO_EXPORT.md and HTML_EXPORT.md, Sheet): a modal dialog on
   * desktop, a bottom sheet on a phone, with the heading and ✕. Esc and ✕ call `onClose`.
   */
  let {
    labelId,
    title,
    subtitle,
    closeLabel,
    closeOnScrim,
    onClose,
    children,
  }: {
    /** The heading's id, unique on the page. */
    labelId: string;
    title: string;
    subtitle: string | null;
    /** ✕'s name: "Abbrechen" while something runs, else "Schließen". */
    closeLabel: string;
    /** Whether a tap beside the sheet closes it: never where something would be lost. */
    closeOnScrim: boolean;
    onClose: () => void;
    children: Snippet;
  } = $props();

  let dialog: HTMLDialogElement;

  // The native modal dialog traps focus and makes the page behind it inert.
  onMount(() => {
    dialog.showModal();
    return () => dialog.close();
  });

  function cancel(event: Event): void {
    event.preventDefault();
    onClose();
  }

  // The sheet fills the dialog, so a click that lands on the dialog itself is on its backdrop.
  function onScrimClick(event: MouseEvent): void {
    if (event.target === dialog && closeOnScrim) {
      onClose();
    }
  }
</script>

<dialog bind:this={dialog} aria-labelledby={labelId} oncancel={cancel} onclick={onScrimClick}>
  <div class="sheet">
    <header>
      <div class="heading">
        <h2 id={labelId}>{title}</h2>
        {#if subtitle !== null}<p>{subtitle}</p>{/if}
      </div>
      <button
        class="icon-btn"
        type="button"
        title={closeLabel}
        aria-label={closeLabel}
        onclick={onClose}
      >
        <Icon name="close" />
      </button>
    </header>
    {@render children()}
  </div>
</dialog>

<style>
  dialog {
    width: calc(100% - 40px);
    max-width: 520px;
    max-height: calc(100% - 48px);
    padding: 0;
    overflow: auto;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
    color: var(--gl-ink);
    box-shadow: var(--gl-shadow);
  }
  dialog::backdrop {
    background: var(--gl-backdrop);
  }
  .sheet {
    display: grid;
    gap: 16px;
    padding: 20px;
  }
  header {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }
  .heading {
    flex: 1;
    min-width: 0;
  }
  h2 {
    margin: 0;
    font-family: var(--gl-font-display);
    font-weight: var(--gl-weight-title);
    font-size: var(--gl-size-panel-title);
    letter-spacing: var(--gl-tracking-title);
    text-wrap: balance;
  }
  .heading p {
    margin: 4px 0 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-label);
  }
  .icon-btn {
    margin: -6px -8px 0 0;
  }
  /* Shared by the states' parts. */
  .sheet :global(b) {
    font-weight: var(--gl-weight-semibold);
  }
  .sheet :global(.hint) {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
    line-height: 1.45;
  }
  .sheet :global(.error-detail) {
    display: block;
    margin-top: 6px;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
    overflow-wrap: anywhere;
  }
  .sheet :global(footer) {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }
  /* The dialog sits in the top layer, outside the screen's container, so the viewport decides;
     the app fills it, so this matches the screens' 720 px container queries. */
  @media (max-width: 720px) {
    dialog {
      inset: auto 0 0;
      width: auto;
      max-width: none;
      max-height: 92%;
      margin: 0;
      border-width: 1px 0 0;
      border-radius: var(--gl-radius-large) var(--gl-radius-large) 0 0;
    }
    .sheet {
      padding: 18px 16px calc(18px + env(safe-area-inset-bottom));
    }
    .sheet :global(footer .btn) {
      flex: 1;
    }
  }
</style>
