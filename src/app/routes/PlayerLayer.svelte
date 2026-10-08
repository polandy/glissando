<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { composeSlideshow } from "../../compose";
  import type { LibraryStore, StoredSlideshow } from "../../library/stored-slideshow";
  import type { Slideshow } from "../../player";
  import { browserObjectUrls } from "../media/object-urls";
  import PlayerOverlay from "../player/PlayerOverlay.svelte";
  import { loadPlayerMusic } from "./route-loading";

  /**
   * The player over its slideshow. Pictures are read by media id as the player buffers them;
   * the music's object URL lives exactly as long as the layer.
   */
  let {
    store,
    stored,
    onClose,
    onError,
  }: {
    store: Pick<LibraryStore, "pictureBlob" | "musicBlob">;
    stored: StoredSlideshow;
    onClose: () => void;
    onError: (error: unknown) => void;
  } = $props();

  let slideshow = $state.raw<Slideshow | null>(null);
  let musicUrl: string | null = null;
  const closed = new AbortController();

  onMount(() => {
    loadPlayerMusic(store, stored, browserObjectUrls.create, closed.signal).then((music) => {
      if (music === null) {
        return;
      }
      musicUrl = music.url;
      slideshow = composeSlideshow(stored, {
        picture: (id) => id,
        music: () => {
          if (music.url === null) {
            throw new Error(`slideshow "${stored.id}" has music but none was loaded`);
          }
          return music.url;
        },
      });
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
    {onClose}
  />
{/if}
