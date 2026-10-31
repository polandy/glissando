<script lang="ts">
  import { onDestroy, onMount, untrack } from "svelte";
  import { MediaQuery } from "svelte/reactivity";
  import { NO_SONG_BEATS } from "../../compose/playlist";
  import { SlideshowNotFoundError } from "../../library/library-store";
  import type { StoredSlideshow } from "../../library/stored-slideshow";
  import type { SlideshowEditor } from "../editing/slideshow-editor";
  import { createScreenEditor } from "./screen-editor";
  import { getTranslator } from "../i18n/context";
  import { loadMusicAnalysis, ScreenEnergyPacing } from "./screen-energy-pacing.svelte";
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
  import { loadSlideshowScreen } from "./route-loading";
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
  import { ScreenStorage } from "./screen-storage.svelte";
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
    beatPass,
    loudnessPass,
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
  let stored = $state.raw<StoredSlideshow | null>(null);
  let editor = $state.raw<SlideshowEditor | null>(null);
  let saving = $state(false);
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
  const screenMoodBpm = new ScreenMoodBpm(beatPass, store, log);
  // svelte-ignore state_referenced_locally
  const screenEnergyPacing = new ScreenEnergyPacing(store, log);
  onMount(() => {
    const stops = [screenFocus.follow(), screenMoodBpm.follow()];
    loadSlideshowScreen(store, slideshowId, thumbnails.urls, translator.language, left.signal).then(
      (loaded) => {
        if (loaded !== null) {
          screenFocus.load(loaded.stored);
          stored = loaded.stored;
          const focusOf = (pictureId: string) => focus.found.get(pictureId);
          const ports = {
            store,
            focusOf,
            toaster,
            newId,
            now,
            random: Math.random,
            onError,
            onGone,
          };
          editor = createScreenEditor(loaded.stored, ports, translator);
          editor.subscribe((edited) => (stored = edited));
          editor.subscribeSaving((isSaving) => (saving = isSaving));
          if (addedPictureIds.length > 0) editor.offerAddUndo(addedPictureIds);
        }
      },
      (error: unknown) => {
        if (error instanceof SlideshowNotFoundError) onBack();
        else onError(error);
      },
    );
    return () => stops.forEach((stop) => stop());
  });
  onDestroy(() => {
    left.abort();
    editor?.dispose();
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
  const details = $derived(
    stored === null ? null : thumbnails.details(stored, translator.language),
  );
  const storage = $derived(stored === null ? null : screenStorage.of(stored, { serverOn, saving }));
  // Rereads only when the songs change: `stored` is read untracked, so only `songIds` reruns this.
  const songIds = $derived(stored === null ? "" : stored.songs.map((song) => song.id).join(","));
  $effect(() => {
    void songIds;
    const current = untrack(() => stored);
    if (current !== null) loadMusicAnalysis(current, screenMoodBpm, screenEnergyPacing);
  });
  const moodBpm = $derived(stored === null ? undefined : screenMoodBpm.of(stored));
  const moodBeats = $derived(stored === null ? NO_SONG_BEATS : screenMoodBpm.beatsOf(stored));
  const moodEnergyPacing = $derived(stored === null ? null : screenEnergyPacing.of(stored));
</script>

{#if editingPictureId !== null && stored !== null && editor !== null}
  <PictureEditorRoute
    {store}
    {stored}
    {focus}
    {focusPass}
    passPaused={screenFocus.passPaused}
    {beatPass}
    {loudnessPass}
    {editor}
    pictureId={editingPictureId}
    {saving}
    {onBack}
    onOpen={onEdit}
    {onError}
    {log}
    {readClipPeaks}
  />
{:else if editingMusic && stored !== null && editor !== null}
  <MusicEditorRoute
    {store}
    {stored}
    {editor}
    {beatPass}
    {loudnessPass}
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
    onAddPictures={() => stored !== null && onAddPictures(stored)}
    {newPictureIds}
    {...pictureActions}
    {onEdit}
    loadPicture={(id) => store.playbackPictureBlob(id)}
    {onError}
    {onEditMusic}
    onTransition={(transition) => editor?.setSlideshowTransition(transition)}
    onResetTransition={() => editor?.resetSlideshowTransition()}
    onLook={(look) => editor?.look.set(look)}
    onResetLook={() => editor?.look.reset()}
    {moodBpm}
    {moodBeats}
    {moodEnergyPacing}
    moodPreviewPorts={{
      store,
      stored: must(stored, "the slideshow"),
      musicOutput,
      decodeClipSound,
      log,
    }}
    onMood={(mood) => editor?.mood.set(mood)}
    onResetMood={() => editor?.mood.reset()}
    onEnergyPacing={(on) => editor?.setEnergyPacing(on)}
    onPortraitPictures={(choice) => editor?.setPortraitPictures(choice)}
    onResetPortraitPictures={() => editor?.resetPortraitPictures()}
    onEnsureOpeningCard={() => must(editor, "the editor").ensureOpeningCard()}
    onOpeningCard={(card) => editor?.setOpeningCard(card)}
    onRemoveOpeningCard={() => editor?.removeOpeningCard()}
    onEnsureClosingCard={() => must(editor, "the editor").ensureClosingCard()}
    onClosingCard={(card) => editor?.setClosingCard(card)}
    onRemoveClosingCard={() => editor?.removeClosingCard()}
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
{#if playing && stored !== null}
  <PlayerLayer
    {store}
    {stored}
    {musicOutput}
    {decodeClipSound}
    onClose={onBack}
    {onError}
    {log}
    {beatPass}
    {home}
    {playbackQuality}
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
