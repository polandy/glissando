<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { composeSlideshow } from "../../compose";
  import type { LibraryStore, StoredSlideshow } from "../../library/stored-slideshow";
  import type { MusicOutput } from "../../player";
  import type { PictureFocus } from "../../library/picture-focus";
  import { browserObjectUrls } from "../media/object-urls";
  import { NO_FOCUS_KNOWN } from "../focus/pictures-focus";
  import type { PlayerFailure } from "../player/PlayerCard.svelte";
  import PlayerOverlay from "../player/PlayerOverlay.svelte";
  import { slideBoundaries } from "../player/slide-boundaries";
  import { loadPlayerMusic } from "./route-loading";
  import { pictureFailureFor, playedPictures } from "./server-playing";
  import type { SlideshowHome } from "./slideshow-storage";

  /**
   * The player over its slideshow. Pictures are read by media id as the player buffers them;
   * the music's object URL lives exactly as long as the layer. A server slideshow plays without
   * the pictures Immich no longer has: one found missing while playing restarts the player
   * without it, where its slide would have begun.
   */
  let {
    store,
    stored,
    musicOutput,
    onClose,
    onError,
    log,
    home,
    missing,
    onPictureMissing,
  }: {
    store: Pick<LibraryStore, "pictureBlob" | "musicBlob" | "pictureFocus">;
    stored: StoredSlideshow;
    musicOutput: MusicOutput;
    onClose: () => void;
    onError: (error: unknown) => void;
    /** Logs a focus that could not be read: play goes on without it. */
    log: (error: unknown) => void;
    home: SlideshowHome;
    /** Pictures Immich answered 404 for, as the screen knows them when playing begins. */
    missing: ReadonlySet<string>;
    onPictureMissing: (pictureId: string) => void;
  } = $props();

  interface Loaded {
    readonly musicUrl: string | null;
    readonly focus: ReadonlyMap<string, PictureFocus>;
  }

  let loaded = $state.raw<Loaded | null>(null);
  let startAt = $state(0);
  let musicUrl: string | null = null;
  /** The pictures known missing when playing began, and those skipped since. */
  // svelte-ignore state_referenced_locally
  let skipped = $state.raw<ReadonlySet<string>>(new Set(missing));
  const played = $derived(playedPictures(stored, skipped));
  const slideshow = $derived(
    loaded === null
      ? null
      : composeSlideshow(
          played,
          {
            picture: (id) => id,
            music: () => {
              const url = loaded?.musicUrl ?? null;
              if (url === null) {
                throw new Error(`slideshow "${stored.id}" has music but none was loaded`);
              }
              return url;
            },
          },
          loaded.focus,
        ),
  );

  function pictureFailure(cause: unknown): PlayerFailure | null {
    const outcome = pictureFailureFor(home, cause);
    if (outcome.kind === "stop") return outcome.failure;
    const { pictureId } = outcome;
    onPictureMissing(pictureId);
    const index = played.pictures.findIndex(({ id }) => id === pictureId);
    if (slideshow === null || index === -1 || played.pictures.length === 1) return "picture";
    const boundaries = slideBoundaries(slideshow);
    startAt = boundaries.starts[index] ?? boundaries.duration;
    skipped = new Set([...skipped, pictureId]);
    return null;
  }
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
      loaded = { musicUrl: music.url, focus };
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
  {#key slideshow}
    <PlayerOverlay
      {slideshow}
      musicTitle={stored.music?.fileName ?? null}
      slideDates={played.pictures.map((picture) => picture.capturedAt)}
      openPicture={(id) => store.pictureBlob(id)}
      {musicOutput}
      {startAt}
      {pictureFailure}
      {onClose}
    />
  {/key}
{/if}
