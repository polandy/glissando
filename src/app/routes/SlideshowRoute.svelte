<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { MediaQuery } from "svelte/reactivity";
  import { titleForCaptureRange } from "../../compose";
  import {
    SlideshowNotFoundError,
    type LibraryStore,
    type StoredSlideshow,
  } from "../../library/stored-slideshow";
  import { SlideshowEditor } from "../editing/slideshow-editor";
  import type { ExportProgress } from "../glissando-file/export-job";
  import { exportMediaKey, exportMenuState } from "../glissando-file/export-menu";
  import { getTranslator } from "../i18n/context";
  import { slideshowDetails } from "../library-views";
  import { browserObjectUrls, ObjectUrls } from "../media/object-urls";
  import SlideshowScreen from "../screens/SlideshowScreen.svelte";
  import type { Toaster } from "../toast/toaster";
  import PlayerLayer from "./PlayerLayer.svelte";
  import { loadSlideshowScreen } from "./route-loading";
  import { deleteShownSlideshow } from "./slideshow-exits";
  import { MOUSE_POINTER_QUERY } from "../screens/slideshow/pointer";

  let {
    store,
    toaster,
    newId,
    now,
    slideshowId,
    exportProgress,
    onExport,
    playing,
    onBack,
    onPlay,
    onDeleted,
    onGone,
    onError,
  }: {
    store: LibraryStore;
    toaster: Toaster;
    newId: () => string;
    now: () => Date;
    slideshowId: string;
    /** The export running in the background, of this slideshow or another. */
    exportProgress: ExportProgress | null;
    onExport: () => void;
    /** The player layer is open over the screen. */
    playing: boolean;
    /** Also taken when the slideshow is no longer on this device. */
    onBack: () => void;
    onPlay: () => void;
    /** The slideshow and its media are gone from the device. */
    onDeleted: () => void;
    /** The slideshow was deleted elsewhere, e.g. in another tab, while it was shown. */
    onGone: () => void;
    onError: (error: unknown) => void;
  } = $props();

  const translator = getTranslator();

  let stored = $state.raw<StoredSlideshow | null>(null);
  let editor: SlideshowEditor | null = null;
  let saving = $state(false);
  /** Measured when the menu opens and the media changed since the last measure. */
  let exportBytes = $state<number | null>(null);
  /** The media the size is measured for; see `exportMediaKey`. */
  let measuredMedia: string | null = null;
  const mousePointer = new MediaQuery(MOUSE_POINTER_QUERY);
  // The store is fixed for the screen's lifetime.
  // svelte-ignore state_referenced_locally
  const thumbnails = new ObjectUrls({
    ...browserObjectUrls,
    load: (id) => store.thumbnailBlob(id),
    onError,
  });

  const left = new AbortController();

  onMount(() => {
    loadSlideshowScreen(store, slideshowId, thumbnails, left.signal).then(
      (loaded) => {
        if (loaded !== null) {
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
  });
  onDestroy(() => {
    left.abort();
    editor?.dispose();
    thumbnails.dispose();
  });

  function createEditor(initial: StoredSlideshow): SlideshowEditor {
    return new SlideshowEditor(initial, {
      store,
      toaster,
      newId,
      now,
      onError,
      onGone,
      removedText: (count) => translator.t("slideshow.removed", { count }),
      undoLabel: () => translator.t("slideshow.undo"),
      lastPictureText: () => translator.t("slideshow.lastPictureStays"),
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

{#if details !== null}
  <SlideshowScreen
    slideshow={details}
    {onBack}
    {onPlay}
    onRemove={(pictureId) => editor?.remove(pictureId)}
    onMove={(pictureId, toIndex) => editor?.move(pictureId, toIndex)}
    onRename={(typed) => editor?.rename(typed)}
    onDelete={deleteSlideshow}
    exportState={exportMenuState(exportProgress, slideshowId, exportBytes)}
    {onExport}
    onMenuOpened={measureExport}
    mousePointer={mousePointer.current}
    {saving}
  />
{/if}
{#if playing && stored !== null}
  <PlayerLayer {store} {stored} onClose={onBack} {onError} />
{/if}
