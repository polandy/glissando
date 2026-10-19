<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { BeatPass } from "../../library/beat-pass";
  import { composeSlideshow, type SongBeats } from "../../compose";
  import type { LibraryStore, StoredSlideshow } from "../../library/stored-slideshow";
  import { performanceClock, type DecodeClipSound, type MusicOutput } from "../../player";
  import type { PictureFocus } from "../../library/picture-focus";
  import { getTranslator } from "../i18n/context";
  import { playingMusic } from "../library-views";
  import { browserObjectUrls } from "../media/object-urls";
  import { storedSongBeats } from "../beats/music-beats-known";
  import { NO_FOCUS_KNOWN } from "../focus/pictures-focus";
  import type { PlayerFailure } from "../player/player-failure";
  import PlayerOverlay from "../player/PlayerOverlay.svelte";
  import PlayerCard from "../player/PlayerCard.svelte";
  import PreparePictures from "../player/PreparePictures.svelte";
  import { PrepareFlow, type PrepareView } from "../player/prepare/prepare-flow";
  import type { PlaybackQuality } from "../settings/playback-quality";
  import { slideBoundaries } from "../player/slide-boundaries";
  import { loadPlayerMusic } from "./route-loading";
  import {
    pictureFailureFor,
    picturesAheadFor,
    playedPictures,
    serverRenditionFor,
  } from "./server-playing";
  import type { SlideshowHome } from "./slideshow-storage";

  /**
   * The player over its slideshow. Pictures are read by media id, in their playback rendition, as
   * the player buffers them, a server slideshow's further ahead (ADR-0018);
   * the music's object URL lives exactly as long as the layer. A server slideshow is prepared in
   * `playbackQuality` before it plays (ADR-0027) and plays without the pictures Immich no longer
   * has: one found missing while playing restarts the player without it, where its slide would
   * have begun.
   */
  let {
    store,
    stored,
    musicOutput,
    decodeClipSound,
    onClose,
    onError,
    log,
    beatPass,
    home,
    missing,
    onPictureMissing,
    playbackQuality,
    clock = performanceClock.now,
  }: {
    store: Pick<
      LibraryStore,
      | "pictureBlob"
      | "playbackPictureBlob"
      | "videoBlob"
      | "musicBlob"
      | "pictureFocus"
      | "musicBeats"
    >;
    stored: StoredSlideshow;
    musicOutput: MusicOutput;
    decodeClipSound: DecodeClipSound;
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
    /** The quality a server slideshow plays in, as this device's setting picks it. */
    playbackQuality: PlaybackQuality;
    /** Monotonic milliseconds, for timing the pictures prepared. */
    clock?: () => number;
  } = $props();

  const { t } = getTranslator();
  /** The only song by its name; a playlist by its count of songs. */
  const musicTitle = $derived.by(() => {
    const music = playingMusic(stored);
    if (music === null) return null;
    return music.kind === "song"
      ? music.fileName
      : t("slideshow.songCount", { count: music.count });
  });

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
            video: (id) => id,
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

  // svelte-ignore state_referenced_locally
  const flow =
    home === "server"
      ? new PrepareFlow({
          ids: played.pictures.map(({ id }) => id),
          quality: playbackQuality,
          renditionFor: (quality) => serverRenditionFor(store, quality),
          clock,
          onMissing: (id) => {
            onPictureMissing(id);
            skipped = new Set([...skipped, id]);
          },
        })
      : null;
  let prepareView = $state.raw<PrepareView | null>(flow?.view ?? null);
  /** The prepare screen's view while the flow measures or prepares. */
  const preparing = $derived.by(() => {
    const view = prepareView;
    if (view === null || view.stage === "playing" || view.stage === "failed") return null;
    return view;
  });
  $effect(() => {
    if (flow !== null && slideshow !== null) flow.setSlides(slideBoundaries(slideshow));
  });
  const openPicture = (id: string): Promise<Blob> =>
    flow === null ? store.playbackPictureBlob(id) : flow.openPicture(id);

  function prepareFailure(error: unknown): PlayerFailure {
    const outcome = pictureFailureFor("server", error);
    return outcome.kind === "stop" ? outcome.failure : "picture";
  }

  function close(): void {
    flow?.close();
    onClose();
  }

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
    const unsubscribe = flow?.subscribe((view) => {
      if (view.stage === "failed") log(view.error);
      prepareView = view;
    });
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
    return unsubscribe;
  });
  onDestroy(() => {
    closed.abort();
    flow?.close();
    for (const url of musicUrls.values()) {
      browserObjectUrls.revoke(url);
    }
  });
</script>

{#if preparing !== null}
  <PreparePictures
    title={stored.title}
    view={preparing}
    onStartNow={() => flow?.startNow()}
    onPlayInPreview={() => flow?.playInPreview()}
    onClose={close}
  />
{:else if prepareView?.stage === "failed"}
  <div class="player" role="dialog" aria-modal="true" aria-label={stored.title}>
    <PlayerCard
      failure={prepareFailure(prepareView.error)}
      ended={false}
      onPlayAgain={close}
      onClose={close}
    />
  </div>
{:else if slideshow !== null}
  {#key slideshow}
    <PlayerOverlay
      {slideshow}
      {musicTitle}
      slideDates={played.pictures.map((picture) => picture.capturedAt)}
      {openPicture}
      readVideo={(id) => store.videoBlob(id)}
      picturesAhead={picturesAheadFor(home)}
      onSlide={(index) => {
        const picture = played.pictures[index];
        if (picture !== undefined) flow?.slidePassed(picture.id);
      }}
      {musicOutput}
      {decodeClipSound}
      {startAt}
      {pictureFailure}
      onClose={close}
    />
  {/key}
{/if}
