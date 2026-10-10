<script lang="ts">
  import { onDestroy, onMount, type Snippet } from "svelte";
  import type { FocusPass, FocusPassState } from "../../library/focus-pass";
  import type { LibraryStore } from "../../library/stored-slideshow";
  import { browserObjectUrls, ObjectUrls } from "../media/object-urls";
  import type { OpenNotice } from "../glissando-file/open-flow";
  import StartScreen from "../screens/StartScreen.svelte";
  import type { ServerShelf, SlideshowSummary } from "../screens/view-models";
  import type { ServerLibrary } from "../../server-library/server-library";
  import { PictureMissingFromImmichError } from "../../server-library/server-slideshow-store";
  import { loadServerShelf } from "./server-shelf-loading";
  import StartLogo from "../start/StartLogo.svelte";
  import { loadStartSlideshows } from "./route-loading";

  let {
    store,
    serverLibrary,
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
    /** Its slideshows show in their own section while it is on or offline. */
    serverLibrary: Pick<ServerLibrary, "availability" | "store" | "memory">;
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

  let server = $state.raw<ServerShelf | null>(null);
  /** Bumped by every availability change, so only the latest shelf load shows. */
  let shelfLoads = 0;
  // The server library is fixed for the screen's lifetime.
  // svelte-ignore state_referenced_locally
  const serverCovers = new ObjectUrls({
    ...browserObjectUrls,
    load: (id) => serverLibrary.store.thumbnailBlob(id),
    // A picture no longer in Immich leaves its cover cell out; the slideshow's screen tells.
    onError: (error) => {
      if (!(error instanceof PictureMissingFromImmichError)) onError(error);
    },
  });

  const left = new AbortController();

  onMount(() => {
    const stopFocus = focusPass.subscribe((next) => (passState = next));
    loadStartSlideshows(store, covers, left.signal).then((loaded) => {
      if (loaded !== null) {
        slideshows = loaded;
      }
    }, onError);
    const stopServer = serverLibrary.availability.subscribe(({ kind }) => {
      const load = ++shelfLoads;
      if (kind !== "on" && kind !== "offline") {
        server = null;
        return;
      }
      loadServerShelf(kind, serverLibrary, serverCovers, left.signal).then((loaded) => {
        if (loaded !== null && load === shelfLoads) server = loaded;
      }, onError);
    });
    return () => {
      stopFocus();
      stopServer();
    };
  });
  onDestroy(() => {
    left.abort();
    covers.dispose();
    serverCovers.dispose();
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
    {server}
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
