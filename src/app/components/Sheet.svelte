<script lang="ts">
  import { onMount, type Snippet } from "svelte";

  /**
   * The settings sheets' frame: a modal dialog on desktop, a bottom sheet on a phone. `side` docks
   * it to the right edge at full height instead, still a bottom sheet on a phone. A tap beside the
   * sheet calls `onClose`; Esc calls `onCancel` when there is one, else `onClose`.
   */
  let {
    labelId,
    width = "regular",
    gap = "compact",
    placement = "center",
    closeOnScrim = true,
    onOpen,
    onClose,
    onCancel,
    children,
  }: {
    /** The heading's id, unique on the page. */
    labelId: string;
    /** `narrow` for a sheet of a few fields. */
    width?: "regular" | "narrow";
    /** The space between the sheet's parts. */
    gap?: "compact" | "roomy";
    /** `side` leaves the padding and the layout of the parts to the content. */
    placement?: "center" | "side";
    /** Whether a tap beside the sheet closes it: never where something would be lost. */
    closeOnScrim?: boolean;
    /** Once the dialog is open, e.g. to focus the checked choice. */
    onOpen?: () => void;
    onClose: () => void;
    onCancel?: () => void;
    children: Snippet;
  } = $props();

  let dialog: HTMLDialogElement;

  // The native modal dialog traps focus and makes the page behind it inert.
  onMount(() => {
    dialog.showModal();
    onOpen?.();
    return () => dialog.close();
  });

  function cancel(event: Event): void {
    event.preventDefault();
    (onCancel ?? onClose)();
  }

  // The sheet fills the dialog, so a click that lands on the dialog itself is on its backdrop.
  function onScrimClick(event: MouseEvent): void {
    if (event.target === dialog && closeOnScrim) {
      onClose();
    }
  }
</script>

<dialog
  bind:this={dialog}
  class:narrow={width === "narrow"}
  class:side={placement === "side"}
  aria-labelledby={labelId}
  oncancel={cancel}
  onclick={onScrimClick}
>
  <div class="sheet" class:roomy={gap === "roomy"}>
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
  dialog.narrow {
    max-width: 480px;
  }
  dialog.side {
    position: fixed;
    inset: 0 0 0 auto;
    width: 440px;
    max-width: 100%;
    height: 100%;
    max-height: none;
    margin: 0;
    border: 0;
    border-left: 1px solid var(--gl-line);
    border-radius: 0;
  }
  dialog::backdrop {
    background: var(--gl-backdrop);
  }
  .sheet {
    display: grid;
    gap: 14px;
    padding: 18px;
  }
  .sheet.roomy {
    gap: 16px;
  }
  .side .sheet {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 0;
  }
  /* The dialog sits in the top layer, outside the screen's container, so the viewport decides;
     the app fills it, so this matches the screens' 720 px container queries. */
  @media (max-width: 720px) {
    dialog {
      inset: auto 0 0;
      width: auto;
      max-width: none;
      max-height: 85%;
      margin: 0;
      border-width: 1px 0 0;
      border-radius: var(--gl-radius-large) var(--gl-radius-large) 0 0;
    }
    /* Restated: the desktop `.side` rule outweighs the plain `dialog` one above. */
    dialog.side {
      inset: 70px 0 0;
      width: auto;
      height: auto;
      border-width: 1px 0 0;
      border-radius: var(--gl-radius-large) var(--gl-radius-large) 0 0;
    }
    .sheet {
      padding-bottom: calc(18px + env(safe-area-inset-bottom));
    }
  }
</style>
