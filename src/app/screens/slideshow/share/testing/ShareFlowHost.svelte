<script lang="ts">
  import { flushSync, type ComponentProps } from "svelte";
  import ShareFlow from "../ShareFlow.svelte";

  /** Test host: ShareFlow with the Share button that opens it, which the screen provides. */
  let props: ComponentProps<typeof ShareFlow> = $props();

  let open = $state(false);
  let shareButton = $state<HTMLButtonElement>();
</script>

<button bind:this={shareButton} class="share-button" type="button" onclick={() => (open = true)}>
  Share
</button>
{#if open}
  <ShareFlow
    {...props}
    onClose={() => {
      open = false;
      // The modal dialog must be gone first: until then the page behind it is inert.
      flushSync();
      shareButton?.focus();
      props.onClose();
    }}
  />
{/if}
