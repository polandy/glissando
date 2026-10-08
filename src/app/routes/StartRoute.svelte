<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { LibraryStore } from "../../library/stored-slideshow";
  import { browserObjectUrls, ObjectUrls } from "../media/object-urls";
  import StartScreen from "../screens/StartScreen.svelte";
  import type { SlideshowSummary } from "../screens/view-models";
  import StartLogo from "../start/StartLogo.svelte";
  import { loadStartSlideshows } from "./route-loading";

  let {
    store,
    playStartAnimation,
    onError,
    onCreate,
    onOpen,
  }: {
    store: LibraryStore;
    playStartAnimation: boolean;
    onError: (error: unknown) => void;
    onCreate: () => void;
    onOpen: (slideshowId: string) => void;
  } = $props();

  let slideshows = $state.raw<readonly SlideshowSummary[] | null>(null);
  // The store is fixed for the screen's lifetime.
  // svelte-ignore state_referenced_locally
  const covers = new ObjectUrls({
    ...browserObjectUrls,
    load: (id) => store.thumbnailBlob(id),
    onError,
  });

  const left = new AbortController();

  onMount(() => {
    loadStartSlideshows(store, covers, left.signal).then((loaded) => {
      if (loaded !== null) {
        slideshows = loaded;
      }
    }, onError);
  });
  onDestroy(() => {
    left.abort();
    covers.dispose();
  });
</script>

{#if slideshows !== null}
  <StartScreen {slideshows} {onCreate} {onOpen}>
    {#snippet logo()}
      <StartLogo play={playStartAnimation} />
    {/snippet}
  </StartScreen>
{/if}
