<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import {
    SlideshowNotFoundError,
    type LibraryStore,
    type StoredSlideshow,
  } from "../../library/stored-slideshow";
  import { slideshowDetails } from "../library-views";
  import { browserObjectUrls, ObjectUrls } from "../media/object-urls";
  import { loadPlayerMedia, type PlayerMedia } from "../media/player-media";
  import SlideshowScreen from "../screens/SlideshowScreen.svelte";
  import type { SlideshowDetails } from "../screens/view-models";
  import PlayerLayer from "./PlayerLayer.svelte";

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
  let media = $state.raw<PlayerMedia | null>(null);
  // The store is fixed for the screen's lifetime.
  // svelte-ignore state_referenced_locally
  const thumbnails = new ObjectUrls({
    ...browserObjectUrls,
    load: (id) => store.thumbnailBlob(id),
    onError,
  });

  onMount(() => {
    void show().catch((error: unknown) => {
      if (error instanceof SlideshowNotFoundError) {
        onBack();
      } else {
        onError(error);
      }
    });
  });
  onDestroy(() => thumbnails.dispose());

  async function show(): Promise<void> {
    const slideshow = await store.getSlideshow(slideshowId);
    thumbnails.sync(slideshow.pictures.map((picture) => picture.id));
    await thumbnails.settled();
    details = slideshowDetails(slideshow, (id) => thumbnails.get(id) ?? "");
    stored = slideshow;
    media = await loadPlayerMedia(store, slideshow);
  }
</script>

{#if details !== null}
  <SlideshowScreen slideshow={details} {onBack} {onPlay} />
{/if}
{#if playing && stored !== null && media !== null}
  <PlayerLayer {stored} {media} onClose={onBack} />
{/if}
