<script lang="ts">
  import { flushSync } from "svelte";
  import DeleteDialog from "./DeleteDialog.svelte";

  /**
   * The whole slideshow's delete confirmation, opened from the ⋯ menu: "Keep" or Esc closes it
   * and hands focus back to the menu button; "Delete" removes the slideshow.
   */
  let {
    title,
    pictureCount,
    onServer,
    onDelete,
    onKept,
  }: {
    title: string;
    pictureCount: number;
    onServer: boolean;
    onDelete: () => void;
    /** Kept or Esc: focus goes back to the ⋯ button the dialog was opened from. */
    onKept: () => void;
  } = $props();

  let confirming = $state(false);

  export function confirm(): void {
    confirming = true;
  }

  function keep(): void {
    confirming = false;
    // The modal dialog must be gone first: until then the page behind it is inert.
    flushSync();
    onKept();
  }

  function deleteConfirmed(): void {
    confirming = false;
    onDelete();
  }
</script>

{#if confirming}
  <DeleteDialog {title} {pictureCount} {onServer} onKeep={keep} onDelete={deleteConfirmed} />
{/if}
