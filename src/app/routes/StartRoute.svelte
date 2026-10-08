<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { LibraryStore } from "../../library/stored-slideshow";
  import { slideshowSummary } from "../library-views";
  import { browserObjectUrls, ObjectUrls } from "../media/object-urls";
  import StartScreen from "../screens/StartScreen.svelte";
  import type { SlideshowSummary } from "../screens/view-models";
  import StartLogo from "../start/StartLogo.svelte";

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

  onMount(() => {
    void showSlideshows().catch(onError);
  });
  onDestroy(() => covers.dispose());

  async function showSlideshows(): Promise<void> {
    const stored = await store.listSlideshows();
    covers.sync(stored.flatMap((slideshow) => slideshow.pictures.slice(0, 1).map(({ id }) => id)));
    await covers.settled();
    slideshows = stored.map((slideshow) =>
      slideshowSummary(slideshow, (id) => covers.get(id) ?? ""),
    );
  }
</script>

{#if slideshows !== null}
  <StartScreen {slideshows} {onCreate} {onOpen}>
    {#snippet logo()}
      <StartLogo play={playStartAnimation} />
    {/snippet}
  </StartScreen>
{/if}
