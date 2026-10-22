<script lang="ts">
  import { flushSync } from "svelte";
  import DeleteDialog from "./DeleteDialog.svelte";

  /** The slideshow screen's delete confirmation: opened from the ⋯ menu, cancel hands focus back. */
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
    /** The dialog was dismissed without deleting; focus goes back to the ⋯ button. */
    onKept: () => void;
  } = $props();

  let confirming = $state(false);

  export function open(): void {
    confirming = true;
  }

  function keep(): void {
    confirming = false;
    // The modal dialog must be gone first: until then the page behind it is inert.
    flushSync();
    onKept();
  }

  function confirmed(): void {
    confirming = false;
    onDelete();
  }
</script>

{#if confirming}
  <DeleteDialog {title} {pictureCount} {onServer} onKeep={keep} onDelete={confirmed} />
{/if}
