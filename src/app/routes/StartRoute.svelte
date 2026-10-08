<script lang="ts">
  import { onDestroy, onMount, type Snippet } from "svelte";
  import type { LibraryStore } from "../../library/stored-slideshow";
  import { browserObjectUrls, ObjectUrls } from "../media/object-urls";
  import type { OpenNotice } from "../glissando-file/open-flow";
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
    onSettings,
    onOpenFile,
    notice,
    onDismissNotice,
    onReload,
    statusBar,
  }: {
    store: LibraryStore;
    playStartAnimation: boolean;
    onError: (error: unknown) => void;
    onCreate: () => void;
    onOpen: (slideshowId: string) => void;
    onSettings: () => void;
    onOpenFile: (file: File) => void;
    notice: OpenNotice | null;
    onDismissNotice: () => void;
    onReload: () => void;
    statusBar: Snippet;
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

{#snippet startLogo()}
  <StartLogo play={playStartAnimation} />
{/snippet}

{#if slideshows !== null}
  <!-- The header carries the brand; the large logo greets an empty library and plays the
       first-launch animation even over a filled one. -->
  <StartScreen
    {slideshows}
    {onCreate}
    {onOpen}
    {onSettings}
    {onOpenFile}
    {notice}
    {onDismissNotice}
    {onReload}
    {statusBar}
    logo={slideshows.length === 0 || playStartAnimation ? startLogo : undefined}
  />
{/if}
