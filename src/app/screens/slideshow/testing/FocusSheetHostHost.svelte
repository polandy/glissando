<script lang="ts">
  import type { ComponentProps } from "svelte";
  import FocusSheetHost from "../FocusSheetHost.svelte";

  /** Test host: FocusSheetHost with the "More" button that opens it, which the screen provides. */
  let props: ComponentProps<typeof FocusSheetHost> = $props();

  let host = $state<FocusSheetHost>();
  let moreButton = $state<HTMLButtonElement>();
</script>

<button bind:this={moreButton} type="button" aria-label="Mehr" onclick={() => host?.show()}>
  Mehr
</button>
<FocusSheetHost
  bind:this={host}
  {...props}
  onClosed={() => {
    moreButton?.focus();
    props.onClosed();
  }}
/>
