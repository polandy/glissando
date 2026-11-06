<script lang="ts">
  import { onDestroy, onMount, untrack } from "svelte";
  import { MediaQuery } from "svelte/reactivity";
  import { NO_SONG_BEATS } from "../../compose/playlist";
  import { getTranslator } from "../i18n/context";
  import { browserObjectUrls } from "../media/object-urls";
  import { ScreenMoodBpm } from "./screen-mood-bpm.svelte";
  import { ScreenThumbnails } from "./screen-thumbnails.svelte";
  import SlideshowScreen from "../screens/SlideshowScreen.svelte";
  import { animationFrames, performanceClock } from "../../player";
  import { REDUCED_MOTION_QUERY } from "../../ui-kit/reduced-motion";
  import MusicEditorRoute from "./MusicEditorRoute.svelte";
  import RouteSkeleton from "./RouteSkeleton.svelte";
  import PictureEditorRoute from "./PictureEditorRoute.svelte";
  import PlayerLayer from "./PlayerLayer.svelte";
  import ServerCopyConfirm from "./ServerCopyConfirm.svelte";
  import { deleteShownSlideshow } from "./slideshow-exits";
  import { must } from "./must";
  import { MOUSE_POINTER_QUERY } from "../screens/slideshow/pointer";
  import {
    NO_SELECTION,
    soleSelection,
    type StripSelection,
  } from "../screens/slideshow/strip-selection";
  import { ScreenExports } from "./screen-exports.svelte";
  import { ScreenFocus } from "./screen-focus.svelte";
  import { ScreenSlideshow } from "./screen-slideshow.svelte";
  import { ScreenStorage } from "./screen-storage.svelte";
  import { slideshowRouteEditorActions } from "./slideshow-route-editor-actions";
  import { slideshowRoutePictureActions } from "./slideshow-route-picture-actions";
  import type { SlideshowRouteProps } from "./slideshow-route-props";
  let {
    store,
    home,
    serverOn,
    onKeepCopy,
    onSaveOnServer,
    serverSessions,
    focusPass,
    analysisPass,
    toaster,
    newId,
    now,
    slideshowId,
    exportProgress,
    onExport,
    videoExport,
    htmlExport,
    playing,
    playbackQuality,
    editingPictureId,
    editingMusic,
    musicAudio,
    musicOutput,
    decodeClipSound,
    readClipPeaks,
    songIntake,
    samplePreview,
    fineSettingsFold,
    musicEditorDetails,
    onBack,
    onPlay,
    onPlayFrom,
    pulsePlay = false,
    onAddPictures,
    addedPictureIds,
    onEdit,
    onEditMusic,
    onDeleted,
    onGone,
    onError,
    log,
  }: SlideshowRouteProps = $props();
  const translator = getTranslator();
  /** The selection survives the picture editor: back there, the edited picture is selected. */
  let selection = $state<StripSelection>(NO_SELECTION);
  $effect(() => {
    if (editingPictureId !== null) selection = soleSelection(editingPictureId);
  });
  const mousePointer = new MediaQuery(MOUSE_POINTER_QUERY);
  const reducedMotion = new MediaQuery(REDUCED_MOTION_QUERY);
  // The store is fixed for the screen's lifetime.
  const thumbnails = new ScreenThumbnails(
    (id) => store.thumbnailBlob(id),
    (error) => onError(error),
  );
  const left = new AbortController();
  // The pass, the store and the export ports are fixed for the screen's lifetime.
  // svelte-ignore state_referenced_locally
  const screenFocus = new ScreenFocus(focusPass, store, onError, left.signal);
  const focus = $derived(screenFocus.current);
  // The ports are fixed for the screen's lifetime.
  // svelte-ignore state_referenced_locally
  const screenSlideshow = new ScreenSlideshow({
    store,
    slideshowId,
    translator,
    thumbnails,
    focus: screenFocus,
    editorPorts: { toaster, newId, now, random: Math.random, onError, onGone },
    addedPictureIds,
    onBack,
    onError,
    left: left.signal,
  });
  const stored = $derived(screenSlideshow.stored);
  const editor = $derived(screenSlideshow.editor);
  const saving = $derived(screenSlideshow.saving);
  // svelte-ignore state_referenced_locally
  const exports = new ScreenExports({
    store,
    home,
    videoExport,
    htmlExport,
    translator,
    shown: () => stored,
    onError,
    left: left.signal,
  });
  // svelte-ignore state_referenced_locally
  const screenMoodBpm = new ScreenMoodBpm(analysisPass, store, log);
  onMount(() => {
    const stops = [screenFocus.follow(), screenMoodBpm.follow()];
    screenSlideshow.load();
    return () => stops.forEach((stop) => stop());
  });
  onDestroy(() => {
    left.abort();
    screenSlideshow.dispose();
    thumbnails.dispose();
    screenStorage.dispose();
  });
  // The slideshow and where it lives are fixed for the screen's lifetime.
  // svelte-ignore state_referenced_locally
  const screenStorage = new ScreenStorage({
    home,
    slideshowId,
    sessions: serverSessions,
    thumbnails,
    editor: () => editor,
  });
  // The ids are handed over once, when the screen opens after adding.
  // svelte-ignore state_referenced_locally
  const newPictureIds: ReadonlySet<string> = new Set(addedPictureIds);
  const pictureActions = slideshowRoutePictureActions(() => editor);
  const editorActions = slideshowRouteEditorActions(() => editor);
  const details = $derived(
    stored === null ? null : thumbnails.details(stored, translator.language),
  );
  const storage = $derived(stored === null ? null : screenStorage.of(stored, { serverOn, saving }));
  // Rereads only when the songs change: `stored` is read untracked, so only `songIds` reruns this.
  const songIds = $derived(stored === null ? "" : stored.songs.map((song) => song.id).join(","));
  $effect(() => {
    void songIds;
    const current = untrack(() => stored);
    if (current !== null) screenMoodBpm.load(current);
  });
  const moodBpm = $derived(stored === null ? undefined : screenMoodBpm.of(stored));
  const moodBeats = $derived(stored === null ? NO_SONG_BEATS : screenMoodBpm.beatsOf(stored));
</script>

{#if editingPictureId !== null && stored !== null && editor !== null}
  <PictureEditorRoute
    {store}
    {stored}
    {focus}
    {focusPass}
    passPaused={screenFocus.passPaused}
    {analysisPass}
    {editor}
    pictureId={editingPictureId}
    {saving}
    {onBack}
    onOpen={onEdit}
    {onPlayFrom}
    {onError}
    {log}
    {readClipPeaks}
  />
{:else if editingMusic && stored !== null && editor !== null}
  <MusicEditorRoute
    {store}
    {stored}
    {editor}
    {analysisPass}
    audio={musicAudio}
    {songIntake}
    {samplePreview}
    detailsStore={musicEditorDetails}
    {toaster}
    {saving}
    {onBack}
    {onError}
    {log}
  />
{:else if details !== null}
  <SlideshowScreen
    bind:selection
    slideshow={details}
    {onBack}
    {onPlay}
    {onPlayFrom}
    {pulsePlay}
    onAddPictures={() => stored !== null && onAddPictures(stored)}
    {newPictureIds}
    {...pictureActions}
    {...editorActions}
    {onEdit}
    loadPicture={(id) => store.playbackPictureBlob(id)}
    {onError}
    {onEditMusic}
    {moodBpm}
    {moodBeats}
    moodPreviewPorts={{
      store,
      stored: must(stored, "the slideshow"),
      objectUrls: browserObjectUrls,
      musicOutput,
      decodeClipSound,
      log,
    }}
    chapterEditor={editor?.chapters ?? null}
    previewPorts={{ clock: performanceClock, frames: animationFrames }}
    reducedMotion={reducedMotion.current}
    onDelete={() => deleteShownSlideshow(store, slideshowId, editor).then(onDeleted, onError)}
    exportState={exports.menuState(exportProgress, slideshowId)}
    {onExport}
    onShareOpened={exports.measure}
    newVideoExport={exports.newVideoExport}
    newHtmlExport={exports.newHtmlExport}
    mousePointer={mousePointer.current}
    {saving}
    {storage}
    serverRows={screenStorage.serverRows}
    onStorageAction={screenStorage.act}
    {fineSettingsFold}
    {focus}
    focusSearch={screenFocus.search(slideshowId)}
    focusPaused={screenFocus.passPaused}
    onLookAgain={(pictureIds) => focusPass.lookAgain(pictureIds)}
  />
{:else}
  <RouteSkeleton variant="strip" />
{/if}
{#if playing !== null && stored !== null}
  <PlayerLayer
    {store}
    {stored}
    {musicOutput}
    {decodeClipSound}
    onClose={onBack}
    {onError}
    {log}
    {analysisPass}
    {home}
    {playbackQuality}
    startPicture={playing.pictureId}
    missing={thumbnails.missing}
    onPictureMissing={(id) => thumbnails.missing.add(id)}
  />
{/if}
{#if screenStorage.confirmingCopy !== null && stored !== null}
  <ServerCopyConfirm
    action={screenStorage.confirmingCopy}
    {stored}
    {store}
    {onKeepCopy}
    {onSaveOnServer}
    onClose={screenStorage.closeCopy}
    {onError}
  />
{/if}
