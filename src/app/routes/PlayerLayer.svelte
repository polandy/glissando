<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { composeSlideshow } from "../../compose";
  import type { LibraryStore, StoredSlideshow } from "../../library/stored-slideshow";
  import type { MusicOutput, Slideshow } from "../../player";
  import { browserObjectUrls } from "../media/object-urls";
  import { NO_FOCUS_KNOWN } from "../focus/pictures-focus";
  import PlayerOverlay from "../player/PlayerOverlay.svelte";
  import { loadPlayerMusic } from "./route-loading";

  /**
   * The player over its slideshow. Pictures are read by media id as the player buffers them;
   * the music's object URL lives exactly as long as the layer.
   */
  let {
    store,
    stored,
    musicOutput,
    onClose,
    onError,
    log,
  }: {
    store: Pick<LibraryStore, "pictureBlob" | "musicBlob" | "pictureFocus">;
    stored: StoredSlideshow;
    musicOutput: MusicOutput;
    onClose: () => void;
    onError: (error: unknown) => void;
    /** Logs a focus that could not be read: play goes on without it. */
    log: (error: unknown) => void;
  } = $props();

  let slideshow = $state.raw<Slideshow | null>(null);
  let musicUrl: string | null = null;
  const closed = new AbortController();

  onMount(() => {
    // Play waits on reading the focus found so far, never on the search for the rest. Focus only
    // aims the automatic motions: unread, they aim at the middle and play goes on.
    Promise.all([
      loadPlayerMusic(store, stored, browserObjectUrls.create, closed.signal),
      store.pictureFocus(stored.pictures.map((picture) => picture.id)).catch((error: unknown) => {
        log(error);
        return NO_FOCUS_KNOWN.found;
      }),
    ]).then(([music, focus]) => {
      if (music === null) {
        return;
      }
      musicUrl = music.url;
      slideshow = composeSlideshow(
        stored,
        {
          picture: (id) => id,
          music: () => {
            if (music.url === null) {
              throw new Error(`slideshow "${stored.id}" has music but none was loaded`);
            }
            return music.url;
          },
        },
        focus,
      );
    }, onError);
  });
  onDestroy(() => {
    closed.abort();
    if (musicUrl !== null) {
      browserObjectUrls.revoke(musicUrl);
    }
  });
</script>

{#if slideshow !== null}
  <PlayerOverlay
    {slideshow}
    musicTitle={stored.music?.fileName ?? null}
    slideDates={stored.pictures.map((picture) => picture.capturedAt)}
    openPicture={(id) => store.pictureBlob(id)}
    {musicOutput}
    {onClose}
  />
{/if}
