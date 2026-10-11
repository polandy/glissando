<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { BeatPass } from "../../library/beat-pass";
  import { composeSlideshow, type SongBeats } from "../../compose";
  import type { LibraryStore, StoredSlideshow } from "../../library/stored-slideshow";
  import type { MusicOutput } from "../../player";
  import type { PictureFocus } from "../../library/picture-focus";
  import { browserObjectUrls } from "../media/object-urls";
  import { storedSongBeats } from "../beats/music-beats-known";
  import { NO_FOCUS_KNOWN } from "../focus/pictures-focus";
  import type { PlayerFailure } from "../player/player-failure";
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
    beatPass,
    home,
    missing,
    onPictureMissing,
  }: {
    store: Pick<LibraryStore, "pictureBlob" | "musicBlob" | "pictureFocus" | "musicBeats">;
    stored: StoredSlideshow;
    musicOutput: MusicOutput;
    onClose: () => void;
    onError: (error: unknown) => void;
    /** Logs a focus or beats that could not be read: play goes on without them. */
    log: (error: unknown) => void;
    /** Listens for the music's beats if none are known yet, for the next time it plays. */
    beatPass: Pick<BeatPass, "listenFor">;
    home: SlideshowHome;
    /** Pictures Immich answered 404 for, as the screen knows them when playing begins. */
    missing: ReadonlySet<string>;
    onPictureMissing: (pictureId: string) => void;
  } = $props();

  interface Loaded {
    readonly musicUrls: ReadonlyMap<string, string>;
    readonly focus: ReadonlyMap<string, PictureFocus>;
    readonly beats: SongBeats;
  }

  let loaded = $state.raw<Loaded | null>(null);
  let startAt = $state(0);
  let musicUrls: ReadonlyMap<string, string> = new Map();
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
            music: (id) => {
              const url = loaded?.musicUrls.get(id);
              if (url === undefined) {
                throw new Error(
                  `slideshow "${stored.id}" plays song "${id}" but it was not loaded`,
                );
              }
              return url;
            },
          },
          loaded.focus,
          loaded.beats,
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
    for (const song of stored.songs) {
      beatPass.listenFor(song.id);
    }
    // Play waits on reading the focus and beats found so far, never on the search for the rest.
    // Both only place automatic choices: unread, the motions aim at the middle, the pictures
    // share the music evenly and play goes on.
    Promise.all([
      loadPlayerMusic(store, stored, browserObjectUrls.create, closed.signal),
      store.pictureFocus(stored.pictures.map((picture) => picture.id)).catch((error: unknown) => {
        log(error);
        return NO_FOCUS_KNOWN.found;
      }),
      storedSongBeats(store, stored, log),
    ]).then(([music, focus, beats]) => {
      if (music === null) {
        return;
      }
      musicUrls = music.urls;
      loaded = { musicUrls: music.urls, focus, beats };
    }, onError);
  });
  onDestroy(() => {
    closed.abort();
    for (const url of musicUrls.values()) {
      browserObjectUrls.revoke(url);
    }
  });
</script>

{#if slideshow !== null}
  {#key slideshow}
    <PlayerOverlay
      {slideshow}
      musicTitle={stored.songs[0]?.fileName ?? null}
      slideDates={played.pictures.map((picture) => picture.capturedAt)}
      openPicture={(id) => store.pictureBlob(id)}
      {musicOutput}
      {startAt}
      {pictureFailure}
      {onClose}
    />
  {/key}
{/if}
