<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { MediaQuery } from "svelte/reactivity";
  import { SlideshowNotFoundError, type StoredSlideshow } from "../../library/stored-slideshow";
  import type { BeatPass } from "../../library/beat-pass";
  import type { FocusPass } from "../../library/focus-pass";
  import type { SlideshowEditor } from "../editing/slideshow-editor";
  import { createScreenEditor } from "./screen-editor";
  import { slideshowStorage, type SlideshowHome } from "./slideshow-storage";
  import type { RouteStore } from "./slideshow-home";
  import type { StorageAction } from "../screens/view-models";
  import type { ExportProgress } from "../glissando-file/export-job";
  import { getTranslator } from "../i18n/context";
  import { ScreenThumbnails } from "./screen-thumbnails.svelte";
  import SlideshowScreen from "../screens/SlideshowScreen.svelte";
  import type { Toaster } from "../toast/toaster";
  import type { MusicEditorAudio } from "../music-editor/music-editor-audio";
  import { animationFrames, performanceClock, type MusicOutput } from "../../player";
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
  import type { VideoExportDevice } from "../video-export/slideshow-video-export";
  import type { HtmlExportDevice } from "../html-export/slideshow-html-export";
  import { ScreenExports } from "./screen-exports.svelte";
  import { ScreenFocus } from "./screen-focus.svelte";

  let {
    store,
    home,
    serverOn,
    onKeepCopy,
    onSaveOnServer,
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
    editingPictureId,
    editingMusic,
    musicAudio,
    musicOutput,
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
  }: {
    /** Where the slideshow lives; a server slideshow's store spares no media and measures none. */
    store: RouteStore;
    home: SlideshowHome;
    /** The server library is on: a device slideshow's screen tells where its pictures are from. */
    serverOn: boolean;
    /** "Keep a copy on this device" of a server slideshow, as shown. */
    onKeepCopy: (slideshow: StoredSlideshow) => void;
    /** "Save on the server" of a device slideshow, as shown. */
    onSaveOnServer: (slideshow: StoredSlideshow) => void;
    /** What it finds updates the editors' automatic motions and focus marks as it goes. */
    focusPass: Pick<FocusPass, "state" | "subscribe">;
    /** What it finds puts the editors' automatic changes on the music's beats as it goes. */
    beatPass: Pick<BeatPass, "subscribe" | "start">;
    toaster: Toaster;
    newId: () => string;
    now: () => Date;
    slideshowId: string;
    /** The export running in the background, of this slideshow or another. */
    exportProgress: ExportProgress | null;
    onExport: () => void;
    /** What "Save as video" needs of the browser. */
    videoExport: VideoExportDevice;
    /** What "Save as web page" needs of the browser. */
    htmlExport: HtmlExportDevice;
    /** The player layer is open over the screen. */
    playing: boolean;
    /** The picture editor is open on this picture, in place of the screen. */
    editingPictureId: string | null;
    /** The music editor is open, in place of the screen. */
    editingMusic: boolean;
    musicAudio: MusicEditorAudio;
    /** Where the player's music sounds. */
    musicOutput: MusicOutput;
    /** Also taken when the slideshow is no longer on this device. */
    onBack: () => void;
    onPlay: () => void;
    /** "Add pictures", with the slideshow as shown. */
    onAddPictures: (slideshow: StoredSlideshow) => void;
    /** Pictures just added: marked as new, and the toast's undo takes them out. */
    addedPictureIds: readonly string[];
    /** Opens the picture editor on a picture, from the screen or from the editor itself. */
    onEdit: (pictureId: string) => void;
    onEditMusic: () => void;
    /** The slideshow and its media are gone from the device. */
    onDeleted: () => void;
    /** The slideshow was deleted elsewhere, e.g. in another tab, while it was shown. */
    onGone: () => void;
    onError: (error: unknown) => void;
    /** Logs an error the user need not be told about. */
    log: (error: unknown) => void;
  } = $props();

  const translator = getTranslator();

  let stored = $state.raw<StoredSlideshow | null>(null);
  let editor = $state.raw<SlideshowEditor | null>(null);
  let saving = $state(false);
  /** The selection survives the picture editor: back there, the edited picture is selected. */
  let selection = $state<StripSelection>(NO_SELECTION);
  $effect(() => {
    if (editingPictureId !== null) {
      selection = soleSelection(editingPictureId);
    }
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
          editor = createEditor(loaded.stored);
          editor.subscribe((edited) => (stored = edited));
          editor.subscribeSaving((isSaving) => (saving = isSaving));
          if (addedPictureIds.length > 0) {
            editor.offerAddUndo(addedPictureIds);
          }
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
  });

  function createEditor(initial: StoredSlideshow): SlideshowEditor {
    const focusOf = (pictureId: string) => focus.found.get(pictureId);
    const ports = { store, focusOf, toaster, newId, now, onError, onGone };
    return createScreenEditor(initial, ports, translator);
  }

  /** The copy whose confirmation sheet is open. */
  let confirmingCopy = $state<"keepCopy" | "saveOnServer" | null>(null);

  function storageAction(action: StorageAction): void {
    if (action === "removeMissing") for (const id of thumbnails.missing) editor?.remove(id);
    else confirmingCopy = action;
  }

  function deleteSlideshow(): void {
    deleteShownSlideshow(store, slideshowId, editor).then(onDeleted, onError);
  }

  // The ids are handed over once, when the screen opens after adding.
  // svelte-ignore state_referenced_locally
  const newPictureIds: ReadonlySet<string> = new Set(addedPictureIds);

  const details = $derived(stored === null ? null : thumbnails.details(stored));
  const storage = $derived(
    stored === null
      ? null
      : slideshowStorage(home, stored, {
          serverOn,
          saving,
          missingCount: thumbnails.missingCount(stored),
        }),
  );
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
  />
{:else if editingMusic && stored !== null && editor !== null}
  <MusicEditorRoute
    {store}
    {stored}
    {editor}
    {beatPass}
    audio={musicAudio}
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
    onMoveGroup={(pictureIds, insertion) => editor?.moveGroup(pictureIds, insertion)}
    onRename={(typed) => editor?.rename(typed)}
    {onEdit}
    {onEditMusic}
    onTransition={(transition) => editor?.setSlideshowTransition(transition)}
    onResetTransition={() => editor?.resetSlideshowTransition()}
    previewPorts={{ clock: performanceClock, frames: animationFrames }}
    reducedMotion={reducedMotion.current}
    onDelete={deleteSlideshow}
    exportState={exports.menuState(exportProgress, slideshowId)}
    {onExport}
    onMenuOpened={exports.measure}
    newVideoExport={exports.newVideoExport}
    newHtmlExport={exports.newHtmlExport}
    mousePointer={mousePointer.current}
    {saving}
    {storage}
    onStorageAction={storageAction}
  />
{/if}
{#if playing && stored !== null}
  <PlayerLayer
    {store}
    {stored}
    {musicOutput}
    onClose={onBack}
    {onError}
    {log}
    {home}
    missing={thumbnails.missing}
    onPictureMissing={(id) => thumbnails.missing.add(id)}
  />
{/if}
{#if confirmingCopy !== null && stored !== null}
  <ServerCopyConfirm
    action={confirmingCopy}
    {stored}
    {store}
    {onKeepCopy}
    {onSaveOnServer}
    onClose={() => (confirmingCopy = null)}
    {onError}
  />
{/if}
