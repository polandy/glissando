<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import {
    SlideshowNotFoundError,
    type LibraryStore,
    type StoredSlideshow,
  } from "../../library/stored-slideshow";
  import { browserObjectUrls, ObjectUrls } from "../media/object-urls";
  import SlideshowScreen from "../screens/SlideshowScreen.svelte";
  import type { SlideshowDetails } from "../screens/view-models";
  import PlayerLayer from "./PlayerLayer.svelte";
  import { loadSlideshowScreen } from "./route-loading";

  let {
    store,
    slideshowId,
    playing,
    onBack,
    onPlay,
    onError,
  }: {
    store: LibraryStore;
    slideshowId: string;
    /** The player layer is open over the screen. */
    playing: boolean;
    /** Also taken when the slideshow is no longer on this device. */
    onBack: () => void;
    onPlay: () => void;
    onError: (error: unknown) => void;
  } = $props();

  let details = $state.raw<SlideshowDetails | null>(null);
  let stored = $state.raw<StoredSlideshow | null>(null);
  // The store is fixed for the screen's lifetime.
  // svelte-ignore state_referenced_locally
  const thumbnails = new ObjectUrls({
    ...browserObjectUrls,
    load: (id) => store.thumbnailBlob(id),
    onError,
  });

  const left = new AbortController();

  onMount(() => {
    loadSlideshowScreen(store, slideshowId, thumbnails, left.signal).then(
      (loaded) => {
        if (loaded !== null) {
          details = loaded.details;
          stored = loaded.stored;
        }
      },
      (error: unknown) => {
        if (error instanceof SlideshowNotFoundError) {
          onBack();
        } else {
          onError(error);
        }
      },
    );
  });
  onDestroy(() => {
    left.abort();
    thumbnails.dispose();
  });
</script>

{#if details !== null}
  <SlideshowScreen slideshow={details} {onBack} {onPlay} />
{/if}
{#if playing && stored !== null}
  <PlayerLayer {store} {stored} onClose={onBack} {onError} />
{/if}
