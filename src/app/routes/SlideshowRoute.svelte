<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { MediaQuery } from "svelte/reactivity";
  import { SlideshowNotFoundError, type StoredSlideshow } from "../../library/stored-slideshow";
  import type { FocusPass, FocusPassState } from "../../library/focus-pass";
  import type { PictureFocus } from "../../library/picture-focus";
  import type { SlideshowEditor } from "../editing/slideshow-editor";
  import { createScreenEditor } from "./screen-editor";
  import { slideshowStorage, type SlideshowHome } from "./slideshow-storage";
  import type { RouteStore } from "./slideshow-home";
  import type { StorageAction } from "../screens/view-models";
  import { NO_FOCUS_KNOWN, picturesFocus } from "../focus/pictures-focus";
  import type { ExportProgress } from "../glissando-file/export-job";
  import { exportMenuState } from "../glissando-file/export-menu";
  import { ExportSize } from "../glissando-file/export-size.svelte";
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
    slideshowVideoExport,
    type VideoExportDevice,
  } from "../video-export/slideshow-video-export";
  import { slideshowHtmlExport, type HtmlExportDevice } from "../html-export/slideshow-html-export";

  let {
    store,
    home,
    serverOn,
    onKeepCopy,
    onSaveOnServer,
    focusPass,
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
  /** As stored when the slideshow was opened; the pass's state adds what it found since. */
  let storedFocus = $state.raw<ReadonlyMap<string, PictureFocus>>(NO_FOCUS_KNOWN.found);
  // The pass is fixed for the screen's lifetime.
  // svelte-ignore state_referenced_locally
  let passState = $state.raw<FocusPassState>(focusPass.state);
  const focus = $derived(picturesFocus(storedFocus, passState));
  /** The selection survives the picture editor: back there, the edited picture is selected. */
  let selectedId = $state<string | null>(null);
  $effect(() => {
    if (editingPictureId !== null) {
      selectedId = editingPictureId;
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
  // svelte-ignore state_referenced_locally
  const exportSize = new ExportSize(store, onError, left.signal);

  onMount(() => {
    const stopFocus = focusPass.subscribe((next) => (passState = next));
    loadSlideshowScreen(store, slideshowId, thumbnails.urls, left.signal).then(
      (loaded) => {
        if (loaded !== null) {
          loadStoredFocus(loaded.stored);
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

  /**
   * Edits never add pictures (adding has its own screen, which reopens this one), so the focus of
   * those opened with is all the screen needs.
   */
  function loadStoredFocus(opened: StoredSlideshow): void {
    store.pictureFocus(opened.pictures.map((picture) => picture.id)).then((read) => {
      if (!left.signal.aborted) storedFocus = read;
    }, onError);
  }

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

  function measureExport(): void {
    // A server slideshow's size is not known before its pictures are downloaded.
    if (stored !== null && home === "device") exportSize.measure(stored);
  }

  /** The slideshow an export of the screen starts from; the screen shows only once it loaded. */
  function loadedForExport(): StoredSlideshow {
    if (stored === null) throw new Error("an export needs the slideshow loaded first");
    return stored;
  }
  const newVideoExport = () => slideshowVideoExport(videoExport, store, loadedForExport());
  const newHtmlExport = () =>
    slideshowHtmlExport(htmlExport, store, loadedForExport(), translator, home);

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
    {editor}
    pictureId={editingPictureId}
    {saving}
    {onBack}
    onOpen={onEdit}
    {onError}
  />
{:else if editingMusic && stored !== null && editor !== null}
  <MusicEditorRoute {store} {stored} {editor} audio={musicAudio} {saving} {onBack} {onError} />
{:else if details !== null}
  <SlideshowScreen
    bind:selectedId
    slideshow={details}
    {onBack}
    {onPlay}
    onAddPictures={() => stored !== null && onAddPictures(stored)}
    {newPictureIds}
    onRemove={(pictureId) => editor?.remove(pictureId)}
    onShift={(pictureId, offset) => editor?.shiftGroup([pictureId], offset)}
    onMove={(pictureId, insertion) => editor?.moveGroup([pictureId], insertion)}
    onRename={(typed) => editor?.rename(typed)}
    {onEdit}
    {onEditMusic}
    onTransition={(transition) => editor?.setSlideshowTransition(transition)}
    onResetTransition={() => editor?.resetSlideshowTransition()}
    previewPorts={{ clock: performanceClock, frames: animationFrames }}
    reducedMotion={reducedMotion.current}
    onDelete={deleteSlideshow}
    exportState={exportMenuState(exportProgress, slideshowId, exportSize.bytes)}
    {onExport}
    onMenuOpened={measureExport}
    {newVideoExport}
    {newHtmlExport}
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
