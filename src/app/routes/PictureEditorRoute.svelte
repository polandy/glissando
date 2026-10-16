<script lang="ts">
  import { onDestroy } from "svelte";
  import type { BeatPass } from "../../library/beat-pass";
  import { MediaQuery } from "svelte/reactivity";
  import type { LibraryStore, StoredSlideshow } from "../../library/stored-slideshow";
  import { animationFrames, performanceClock } from "../../player";
  import { composedBeats, type BeatsStatus } from "../beats/music-beats-known";
  import { PlaylistBeats } from "../beats/playlist-beats";
  import type { PicturesFocus } from "../focus/pictures-focus";
  import type { SlideshowEditor } from "../editing/slideshow-editor";
  import { browserObjectUrls, ObjectUrls } from "../media/object-urls";
  import { REDUCED_MOTION_QUERY } from "../../ui-kit/reduced-motion";
  import type { ClipSoundWave, ReadClipPeaks } from "../clip-editor/clip-sound-wave";
  import ClipEditorScreen from "../clip-editor/ClipEditorScreen.svelte";
  import PictureEditorScreen from "../picture-editor/PictureEditorScreen.svelte";
  import { pictureEditorView } from "../picture-editor/picture-editor-view";

  /** The picture editor over the slideshow screen's editor: its edits are stored the same way. */
  let {
    store,
    stored,
    focus,
    beatPass,
    editor,
    pictureId,
    saving,
    onBack,
    onOpen,
    onError,
    log,
    readClipPeaks,
  }: {
    store: Pick<LibraryStore, "pictureBlob" | "videoBlob" | "musicBeats">;
    stored: StoredSlideshow;
    /** The pictures' focus, updated as the background pass finds it. */
    focus: PicturesFocus;
    /** What it finds puts the automatic changes on the music's beats as it goes. */
    beatPass: Pick<BeatPass, "subscribe" | "listenFor">;
    editor: SlideshowEditor;
    pictureId: string;
    saving: boolean;
    onBack: () => void;
    onOpen: (pictureId: string) => void;
    onError: (error: unknown) => void;
    /** Logs beats that could not be read: the pictures share the music evenly meanwhile. */
    log: (error: unknown) => void;
    readClipPeaks: ReadClipPeaks;
  } = $props();

  const reducedMotion = new MediaQuery(REDUCED_MOTION_QUERY);
  // The store is fixed for the route's lifetime.
  // svelte-ignore state_referenced_locally
  const pictures = new ObjectUrls({
    ...browserObjectUrls,
    load: (id) => store.pictureBlob(id),
    onError,
  });
  let pictureUrls = $state.raw<ReadonlyMap<string, string>>(new Map());
  const stopUrls = pictures.subscribe((urls) => (pictureUrls = urls));
  onDestroy(() => {
    stopUrls();
    pictures.dispose();
  });

  // svelte-ignore state_referenced_locally
  const clips = new ObjectUrls({
    ...browserObjectUrls,
    load: (id) => store.videoBlob(id),
    onError,
  });
  let clipUrls = $state.raw<ReadonlyMap<string, string>>(new Map());
  const stopClips = clips.subscribe((urls) => (clipUrls = urls));
  onDestroy(() => {
    stopClips();
    clips.dispose();
  });

  let beats = $state.raw<ReadonlyMap<string, BeatsStatus>>(new Map());
  // The ports are fixed for the route's lifetime.
  // svelte-ignore state_referenced_locally
  const playlistBeats = new PlaylistBeats({ store, pass: beatPass, log }, (status) => {
    beats = status;
  });
  onDestroy(() => playlistBeats.dispose());
  const songIds = $derived(stored.songs.map(({ id }) => id));
  $effect(() => {
    playlistBeats.follow(songIds).catch(onError);
  });
  const songBeats = $derived(
    new Map([...beats].map(([songId, status]) => [songId, composedBeats(status)])),
  );

  const present = $derived(stored.pictures.some((picture) => picture.id === pictureId));
  const view = $derived(present ? pictureEditorView(stored, pictureId, focus, songBeats) : null);
  // The neighbours load ahead, so ‹ and › show their picture at once.
  $effect(() =>
    pictures.sync(
      view === null ? [] : [view.id, view.previousId, view.nextId].filter((id) => id !== null),
    ),
  );
  const video = $derived(stored.pictures.find((picture) => picture.id === pictureId)?.video);
  $effect(() => clips.sync(video === undefined ? [] : [video.mediaId]));

  // Tracked as plain values, so an unrelated edit to `stored` does not restart the read.
  const clipMediaId = $derived(video?.mediaId);
  const clipSourceMs = $derived(video?.sourceMs);
  let wave = $state.raw<ClipSoundWave | null>(null);
  $effect(() => {
    const mediaId = clipMediaId;
    const sourceMs = clipSourceMs;
    wave = null;
    if (mediaId === undefined || sourceMs === undefined) return;
    const controller = new AbortController();
    store
      .videoBlob(mediaId)
      .then((blob) => {
        if (controller.signal.aborted) return;
        return readClipPeaks(blob, sourceMs, controller.signal, (nextWave) => {
          wave = nextWave;
        });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) wave = { kind: "unreadable" };
        log(error);
      });
    return () => controller.abort();
  });
  // A picture removed meanwhile, e.g. in another tab, has nothing left to edit.
  $effect(() => {
    if (!present) {
      onBack();
    }
  });
</script>

{#if view !== null && video !== undefined}
  {#key view.id}
    <ClipEditorScreen
      slide={view}
      {video}
      slideshowTitle={stored.title}
      posterUrl={pictureUrls.get(view.id) ?? null}
      videoUrl={clipUrls.get(video.mediaId) ?? null}
      {wave}
      {saving}
      {onBack}
      {onOpen}
      onExcerpt={(startMs, endMs) => editor.video.setExcerpt(view.id, startMs, endMs)}
      onVolume={(volume) => editor.video.setVolume(view.id, volume)}
      onDuckMusic={(duck) => editor.video.setDuckMusic(view.id, duck)}
      onReset={() => editor.video.reset(view.id)}
    />
  {/key}
{:else if view !== null}
  {#key view.id}
    <PictureEditorScreen
      picture={view}
      pictureUrl={pictureUrls.get(view.id) ?? null}
      nextPictureUrl={view.nextId === null ? null : (pictureUrls.get(view.nextId) ?? null)}
      slideshowTitle={stored.title}
      {onBack}
      {onOpen}
      onChange={(motion) => editor.setKenBurns(view.id, motion)}
      onSwap={() => editor.swapKenBurns(view.id)}
      onReset={() => editor.resetKenBurns(view.id)}
      onCaption={(typed) => editor.setCaption(view.id, typed)}
      onDuration={(durationMs) => editor.setDuration(view.id, durationMs)}
      onResetDuration={() => editor.resetDuration(view.id)}
      onTransition={(choice) => editor.setTransition(view.id, choice)}
      onResetTransition={() => editor.resetTransition(view.id)}
      onAlone={(alone) => editor.setPictureAlone(view.id, alone)}
      previewPorts={{ clock: performanceClock, frames: animationFrames }}
      reducedMotion={reducedMotion.current}
      {saving}
    />
  {/key}
{/if}
