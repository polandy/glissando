<script lang="ts">
  import Separator from "./Separator.svelte";
  import { SEPARATOR } from "./separator";

  /** A line of parts joined by " · ", shown with room around each dot. */
  let { text }: { text: string } = $props();

  const parts = $derived(text.split(SEPARATOR));
</script>

{#each parts as part, index (index)}{#if index > 0}<Separator />{/if}{part}{/each}
