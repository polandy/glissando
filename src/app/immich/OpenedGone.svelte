<script lang="ts">
  import type { BrowseFailure } from "../../immich/browse-failure";
  import BrowseFailed from "./BrowseFailed.svelte";
  import BrowseState from "./BrowseState.svelte";

  /** An opened album or person that is loading, failed to load, or is no longer in Immich. */
  let {
    loadingTitle,
    goneTitle,
    backLabel,
    failure,
    loaded,
    onRetry,
    onBack,
    onReload,
  }: {
    loadingTitle: string;
    goneTitle: string;
    backLabel: string;
    failure: BrowseFailure | null;
    /** Whether the list it should be in has arrived. */
    loaded: boolean;
    onRetry: () => void;
    onBack: () => void;
    onReload: () => void;
  } = $props();
</script>

{#if failure !== null}
  <BrowseFailed {failure} {onRetry} {onReload} />
{:else if !loaded}
  <BrowseState icon="image" title={loadingTitle} />
{:else}
  <BrowseState icon="image" title={goneTitle}>
    {#snippet action()}
      <button class="btn" type="button" onclick={onBack}>{backLabel}</button>
    {/snippet}
  </BrowseState>
{/if}
