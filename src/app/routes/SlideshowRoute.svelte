<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { MediaQuery } from "svelte/reactivity";
  import { SlideshowNotFoundError, type StoredSlideshow } from "../../library/stored-slideshow";
  import type { SlideshowEditor } from "../editing/slideshow-editor";
  import { createScreenEditor } from "./screen-editor";
  import { getTranslator } from "../i18n/context";
  import { ScreenThumbnails } from "./screen-thumbnails.svelte";
  import SlideshowScreen from "../screens/SlideshowScreen.svelte";
  import { animationFrames, performanceClock } from "../../player";
  import { REDUCED_MOTION_QUERY } from "../../ui-kit/reduced-motion";
  import MusicEditorRoute from "./MusicEditorRoute.svelte";
  import PictureEditorRoute from "./PictureEditorRoute.svelte";
  import PlayerLayer from "./PlayerLayer.svelte";
  import ServerCopyConfirm from "./ServerCopyConfirm.svelte";
  import { loadSlideshowScreen } from "./route-loading";
  import { deleteShownSlideshow } from "./slideshow-exits";
  import { MOUSE_POINTER_QUERY } from "../screens/slideshow/pointer";
  import {
    NO_SELECTION,
    soleSelection,
    type StripSelection,
  } from "../screens/slideshow/strip-selection";
  import { ScreenExports } from "./screen-exports.svelte";
  import { ScreenFocus } from "./screen-focus.svelte";
  import { ScreenStorage } from "./screen-storage.svelte";
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
    videoElementPool,
    readClipPeaks,
    songIntake,
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

  onMount(() => {
    const stopFocus = screenFocus.follow();
    loadSlideshowScreen(store, slideshowId, thumbnails.urls, left.signal).then(
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
    return stopFocus;
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

  /** The card sheet only opens once the screen (and so the editor) is shown. */
  function mustEditor(): SlideshowEditor {
    if (editor === null) throw new Error("the editor is not ready yet");
    return editor;
  }

  const details = $derived(stored === null ? null : thumbnails.details(stored));
  const storage = $derived(stored === null ? null : screenStorage.of(stored, { serverOn, saving }));
</script>

{#if editingPictureId !== null && stored !== null && editor !== null}
  <PictureEditorRoute
    {store}
    {stored}
    {focus}
    {beatPass}
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
    audio={musicAudio}
    {songIntake}
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
    onRemove={(pictureId) => editor?.remove(pictureId)}
    onShiftGroup={(pictureIds, offset) => editor?.shiftGroup(pictureIds, offset)}
    onRemoveGroup={(pictureIds) => editor?.removeGroup(pictureIds)}
    onShuffle={() => editor?.shuffle()}
    onMoveGroup={(pictureIds, insertion) => editor?.moveGroup(pictureIds, insertion)}
    onRename={(typed) => editor?.rename(typed)}
    {onEdit}
    loadPicture={(id) => store.playbackPictureBlob(id)}
    {onError}
    {onEditMusic}
    onTransition={(transition) => editor?.setSlideshowTransition(transition)}
    onResetTransition={() => editor?.resetSlideshowTransition()}
    onPortraitPictures={(choice) => editor?.setPortraitPictures(choice)}
    onResetPortraitPictures={() => editor?.resetPortraitPictures()}
    onEnsureOpeningCard={() => mustEditor().ensureOpeningCard()}
    onOpeningCard={(card) => editor?.setOpeningCard(card)}
    onRemoveOpeningCard={() => editor?.removeOpeningCard()}
    onEnsureClosingCard={() => mustEditor().ensureClosingCard()}
    onClosingCard={(card) => editor?.setClosingCard(card)}
    onRemoveClosingCard={() => editor?.removeClosingCard()}
    previewPorts={{ clock: performanceClock, frames: animationFrames }}
    reducedMotion={reducedMotion.current}
    onDelete={() => deleteShownSlideshow(store, slideshowId, editor).then(onDeleted, onError)}
    exportState={exports.menuState(exportProgress, slideshowId)}
    {onExport}
    onMenuOpened={exports.measure}
    newVideoExport={exports.newVideoExport}
    newHtmlExport={exports.newHtmlExport}
    mousePointer={mousePointer.current}
    {saving}
    {storage}
    serverRows={screenStorage.serverRows}
    onStorageAction={screenStorage.act}
  />
{/if}
{#if playing && stored !== null}
  <PlayerLayer
    {store}
    {stored}
    {musicOutput}
    {videoElementPool}
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
