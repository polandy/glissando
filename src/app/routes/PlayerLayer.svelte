<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { BeatPass } from "../../library/beat-pass";
  import type { LibraryStore } from "../../library/library-store";
  import type { StoredSlideshow } from "../../library/stored-slideshow";
  import { performanceClock, type DecodeClipSound, type MusicOutput } from "../../player";
  import { getTranslator } from "../i18n/context";
  import { playingMusic } from "../library-views";
  import { browserObjectUrls } from "../media/object-urls";
  import type { PlayerFailure } from "../player/player-failure";
  import PlayerOverlay from "../player/PlayerOverlay.svelte";
  import PlayerCard from "../player/PlayerCard.svelte";
  import PreparePictures from "../player/PreparePictures.svelte";
  import { PrepareFlow, type PrepareView } from "../player/prepare/prepare-flow";
  import type { PlaybackQuality } from "../settings/playback-quality";
  import { FROM_THE_START, playStart } from "../player/play-start";
  import { slideBoundaries } from "../player/slide-boundaries";
  import { picturePassedBySlide, slideOfPicture } from "../player/prepare/slide-pictures";
  import { composePlayerSlideshow, loadPlayerData, type PlayerData } from "./player-layer-data";
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
    startPicture,
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
      | "musicLoudness"
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
    /** The picture playing begins with, at its slide; null for the start. */
    startPicture: string | null;
    /** Monotonic milliseconds, for timing the pictures prepared. */
    clock?: () => number;
  } = $props();

  const { t, language } = getTranslator();
  /** The only song by its name; a playlist by its count of songs. */
  const musicTitle = $derived.by(() => {
    const music = playingMusic(stored);
    if (music === null) return null;
    return music.kind === "song"
      ? music.fileName
      : t("slideshow.songCount", { count: music.count });
  });

  let loaded = $state.raw<PlayerData | null>(null);
  /** Where a picture that failed while playing restarts the player, over the chosen start. */
  let restartAt = $state<number | null>(null);
  let musicUrls: ReadonlyMap<string, string> = new Map();
  /** The pictures known missing when playing began, and those skipped since. */
  // svelte-ignore state_referenced_locally
  let skipped = $state.raw<ReadonlySet<string>>(new Set(missing));
  const played = $derived(playedPictures(stored, skipped));
  const slideshow = $derived(
    loaded === null ? null : composePlayerSlideshow(played, loaded, stored.id, language),
  );

  const start = $derived(
    slideshow === null
      ? FROM_THE_START
      : playStart(
          slideshow,
          played.pictures.map(({ id }) => id),
          startPicture,
        ),
  );
  const startAt = $derived(restartAt ?? start.seconds);

  // svelte-ignore state_referenced_locally
  const flow =
    home === "server"
      ? new PrepareFlow({
          ids: played.pictures.map(({ id }) => id),
          startPicture,
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
    if (flow !== null && slideshow !== null)
      flow.setSlides(
        slideBoundaries(slideshow),
        start.slide,
        picturePassedBySlide(
          slideshow.slides,
          played.pictures.map(({ id }) => id),
        )[start.slide] ?? undefined,
      );
  });
  /** The picture each slide passes, so the flow releases the renditions before it. */
  const passedBySlide = $derived(
    slideshow === null
      ? []
      : picturePassedBySlide(
          slideshow.slides,
          played.pictures.map(({ id }) => id),
        ),
  );
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
    if (slideshow === null || played.pictures.length === 1) return "picture";
    const ids = played.pictures.map(({ id }) => id);
    const index = slideOfPicture(slideshow.slides, ids, pictureId);
    if (index === -1) return "picture";
    const boundaries = slideBoundaries(slideshow);
    restartAt = boundaries.starts[index] ?? boundaries.duration;
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
    loadPlayerData(store, stored, log, closed.signal).then((data) => {
      if (data === null) {
        return;
      }
      musicUrls = data.musicUrls;
      loaded = data;
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
      {openPicture}
      readVideo={(id) => store.videoBlob(id)}
      picturesAhead={picturesAheadFor(home)}
      onSlide={(index) => {
        const picture = passedBySlide[index];
        if (picture !== undefined && picture !== null) flow?.slidePassed(picture);
      }}
      {musicOutput}
      {decodeClipSound}
      {startAt}
      {pictureFailure}
      onClose={close}
    />
  {/key}
{/if}
