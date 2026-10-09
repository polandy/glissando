<script lang="ts">
  import { onDestroy, onMount, type Snippet } from "svelte";
  import type { FocusPass, FocusPassState } from "../../library/focus-pass";
  import type { LibraryStore } from "../../library/stored-slideshow";
  import { browserObjectUrls, ObjectUrls } from "../media/object-urls";
  import type { OpenNotice } from "../glissando-file/open-flow";
  import StartScreen from "../screens/StartScreen.svelte";
  import type { SlideshowSummary } from "../screens/view-models";
  import StartLogo from "../start/StartLogo.svelte";
  import { loadStartSlideshows } from "./route-loading";

  let {
    store,
    focusPass,
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
    /** Its progress per slideshow shows on the cards. */
    focusPass: Pick<FocusPass, "state" | "subscribe">;
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
  // The pass is fixed for the screen's lifetime.
  // svelte-ignore state_referenced_locally
  let passState = $state.raw<FocusPassState>(focusPass.state);
  // The store is fixed for the screen's lifetime.
  // svelte-ignore state_referenced_locally
  const covers = new ObjectUrls({
    ...browserObjectUrls,
    load: (id) => store.thumbnailBlob(id),
    onError,
  });

  const left = new AbortController();

  onMount(() => {
    const stopFocus = focusPass.subscribe((next) => (passState = next));
    loadStartSlideshows(store, covers, left.signal).then((loaded) => {
      if (loaded !== null) {
        slideshows = loaded;
      }
    }, onError);
    return stopFocus;
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
    focusSearches={passState.slideshows}
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
