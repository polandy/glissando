<script lang="ts">
  import type { ComponentProps } from "svelte";
  import ShareFlow from "../ShareFlow.svelte";

  /** Test host: ShareFlow with the Share button that opens it, which the screen provides. */
  let props: ComponentProps<typeof ShareFlow> = $props();

  let flow = $state<ShareFlow>();
  let shareButton = $state<HTMLButtonElement>();
</script>

<button bind:this={shareButton} class="share-button" type="button" onclick={() => flow?.open()}>
  Share
</button>
<ShareFlow
  bind:this={flow}
  {...props}
  onClosed={() => {
    shareButton?.focus();
    props.onClosed();
  }}
/>
