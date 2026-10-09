<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { MediaQuery } from "svelte/reactivity";
  import { titleForCaptureRange } from "../../compose";
  import {
    SlideshowNotFoundError,
    type LibraryStore,
    type StoredSlideshow,
  } from "../../library/stored-slideshow";
  import type { FocusPass, FocusPassState } from "../../library/focus-pass";
  import type { PictureFocus } from "../../library/picture-focus";
  import { SlideshowEditor } from "../editing/slideshow-editor";
  import { picturesFocus } from "../focus/pictures-focus";
  import type { ExportProgress } from "../glissando-file/export-job";
  import { exportMediaKey, exportMenuState } from "../glissando-file/export-menu";
  import { getTranslator } from "../i18n/context";
  import { slideshowDetails } from "../library-views";
  import { browserObjectUrls, ObjectUrls } from "../media/object-urls";
  import SlideshowScreen from "../screens/SlideshowScreen.svelte";
  import type { Toaster } from "../toast/toaster";
  import type { MusicEditorAudio } from "../music-editor/music-editor-audio";
  import { animationFrames, performanceClock, type MusicOutput } from "../../player";
  import { REDUCED_MOTION_QUERY } from "../reduced-motion";
  import MusicEditorRoute from "./MusicEditorRoute.svelte";
  import PictureEditorRoute from "./PictureEditorRoute.svelte";
  import PlayerLayer from "./PlayerLayer.svelte";
  import { loadSlideshowScreen } from "./route-loading";
  import { deleteShownSlideshow } from "./slideshow-exits";
  import { MOUSE_POINTER_QUERY } from "../screens/slideshow/pointer";

  let {
    store,
    focusPass,
    toaster,
    newId,
    now,
    slideshowId,
    exportProgress,
    onExport,
    playing,
    editingPictureId,
    editingMusic,
    musicAudio,
    musicOutput,
    onBack,
    onPlay,
    onEdit,
    onEditMusic,
    onDeleted,
    onGone,
    onError,
  }: {
    store: LibraryStore;
    /** What it finds updates the editors' automatic motions and focus marks as it goes. */
    focusPass: Pick<FocusPass, "state" | "subscribe">;
    toaster: Toaster;
    newId: () => string;
    now: () => Date;
    slideshowId: string;
    /** The export running in the background, of this slideshow or another. */
    exportProgress: ExportProgress | null;
    onExport: () => void;
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
    /** Opens the picture editor on a picture, from the screen or from the editor itself. */
    onEdit: (pictureId: string) => void;
    onEditMusic: () => void;
    /** The slideshow and its media are gone from the device. */
    onDeleted: () => void;
    /** The slideshow was deleted elsewhere, e.g. in another tab, while it was shown. */
    onGone: () => void;
    onError: (error: unknown) => void;
  } = $props();

  const translator = getTranslator();

  let stored = $state.raw<StoredSlideshow | null>(null);
  let editor = $state.raw<SlideshowEditor | null>(null);
  let saving = $state(false);
  /** As stored when the slideshow was opened; the pass's state adds what it found since. */
  let storedFocus = $state.raw<ReadonlyMap<string, PictureFocus>>(new Map());
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
  /** Measured when the menu opens and the media changed since the last measure. */
  let exportBytes = $state<number | null>(null);
  /** The media the size is measured for; see `exportMediaKey`. */
  let measuredMedia: string | null = null;
  const mousePointer = new MediaQuery(MOUSE_POINTER_QUERY);
  const reducedMotion = new MediaQuery(REDUCED_MOTION_QUERY);
  // The store is fixed for the screen's lifetime.
  // svelte-ignore state_referenced_locally
  const thumbnails = new ObjectUrls({
    ...browserObjectUrls,
    load: (id) => store.thumbnailBlob(id),
    onError,
  });

  const left = new AbortController();

  onMount(() => {
    const stopFocus = focusPass.subscribe((next) => (passState = next));
    loadSlideshowScreen(store, slideshowId, thumbnails, left.signal).then(
      (loaded) => {
        if (loaded !== null) {
          loadStoredFocus(loaded.stored);
          stored = loaded.stored;
          editor = createEditor(loaded.stored);
          editor.subscribe((edited) => (stored = edited));
          editor.subscribeSaving((isSaving) => (saving = isSaving));
        }
      },
      (error: unknown) => {
        if (error instanceof SlideshowNotFoundError) {
          onBack();
        } else {
          onError(error);
        }
      },
    );
    return stopFocus;
  });
  onDestroy(() => {
    left.abort();
    editor?.dispose();
    thumbnails.dispose();
  });

  /** Edits never add pictures, so the focus of those opened with is all the screen needs. */
  function loadStoredFocus(opened: StoredSlideshow): void {
    store.pictureFocus(opened.pictures.map((picture) => picture.id)).then((read) => {
      if (!left.signal.aborted) {
        storedFocus = read;
      }
    }, onError);
  }

  function createEditor(initial: StoredSlideshow): SlideshowEditor {
    return new SlideshowEditor(initial, {
      store,
      focusOf: (pictureId) => focus.found.get(pictureId),
      toaster,
      newId,
      now,
      onError,
      onGone,
      removedText: (count) => translator.t("slideshow.removed", { count }),
      undoLabel: () => translator.t("slideshow.undo"),
      lastPictureText: () => translator.t("slideshow.lastPictureStays"),
      motionAutomaticText: () => translator.t("editor.motionAutomatic"),
      durationAutomaticText: () => translator.t("editor.durationAutomatic"),
      transitionAutomaticText: () => translator.t("editor.transitionAutomatic"),
      slideshowTransitionResetText: () => translator.t("transitions.resetDone"),
      automaticTitle: (slideshow) =>
        titleForCaptureRange(
          slideshow.pictures.map((picture) => picture.capturedAt),
          translator.language,
        ),
    });
  }

  function measureExport(): void {
    if (stored === null) {
      return;
    }
    const media = exportMediaKey(stored);
    if (media === measuredMedia) {
      return;
    }
    measuredMedia = media;
    exportBytes = null;
    store.mediaBytes(stored).then(
      (bytes) => {
        if (!left.signal.aborted && measuredMedia === media) {
          exportBytes = bytes;
        }
      },
      (error: unknown) => {
        measuredMedia = null;
        onError(error);
      },
    );
  }

  function deleteSlideshow(): void {
    deleteShownSlideshow(store, slideshowId, editor).then(onDeleted, onError);
  }

  // The thumbnails are loaded once, for every picture: an undo brings back ones already loaded.
  const details = $derived(
    stored === null ? null : slideshowDetails(stored, (id) => thumbnails.get(id) ?? ""),
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
    onRemove={(pictureId) => editor?.remove(pictureId)}
    onMove={(pictureId, toIndex) => editor?.move(pictureId, toIndex)}
    onRename={(typed) => editor?.rename(typed)}
    {onEdit}
    {onEditMusic}
    onTransition={(transition) => editor?.setSlideshowTransition(transition)}
    onResetTransition={() => editor?.resetSlideshowTransition()}
    previewPorts={{ clock: performanceClock, frames: animationFrames }}
    reducedMotion={reducedMotion.current}
    onDelete={deleteSlideshow}
    exportState={exportMenuState(exportProgress, slideshowId, exportBytes)}
    {onExport}
    onMenuOpened={measureExport}
    mousePointer={mousePointer.current}
    {saving}
  />
{/if}
{#if playing && stored !== null}
  <PlayerLayer {store} {stored} {musicOutput} onClose={onBack} {onError} />
{/if}
