<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { BeatPass } from "../../library/beat-pass";
  import { MediaQuery } from "svelte/reactivity";
  import type { LibraryStore, StoredSlideshow } from "../../library/stored-slideshow";
  import { animationFrames, performanceClock } from "../../player";
  import { composedBeats, type BeatsStatus } from "../beats/music-beats-known";
  import { TrackBeats } from "../beats/track-beats";
  import type { PicturesFocus } from "../focus/pictures-focus";
  import type { SlideshowEditor } from "../editing/slideshow-editor";
  import { browserObjectUrls, ObjectUrls } from "../media/object-urls";
  import { REDUCED_MOTION_QUERY } from "../../ui-kit/reduced-motion";
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
  }: {
    store: Pick<LibraryStore, "pictureBlob" | "musicBeats">;
    stored: StoredSlideshow;
    /** The pictures' focus, updated as the background pass finds it. */
    focus: PicturesFocus;
    /** What it finds puts the automatic changes on the music's beats as it goes. */
    beatPass: Pick<BeatPass, "subscribe">;
    editor: SlideshowEditor;
    pictureId: string;
    saving: boolean;
    onBack: () => void;
    onOpen: (pictureId: string) => void;
    onError: (error: unknown) => void;
    /** Logs beats that could not be read: the pictures share the music evenly meanwhile. */
    log: (error: unknown) => void;
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

  let beats = $state.raw<BeatsStatus>({ kind: "listening" });
  onMount(() => {
    if (stored.music === undefined) return;
    const track = new TrackBeats(stored.music.id, { store, pass: beatPass, log }, (status) => {
      beats = status;
    });
    return () => track.dispose();
  });

  const present = $derived(stored.pictures.some((picture) => picture.id === pictureId));
  const view = $derived(
    present ? pictureEditorView(stored, pictureId, focus, composedBeats(beats)) : null,
  );
  // The neighbours load ahead, so ‹ and › show their picture at once.
  $effect(() =>
    pictures.sync(
      view === null ? [] : [view.id, view.previousId, view.nextId].filter((id) => id !== null),
    ),
  );
  // A picture removed meanwhile, e.g. in another tab, has nothing left to edit.
  $effect(() => {
    if (!present) {
      onBack();
    }
  });
</script>

{#if view !== null}
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
      previewPorts={{ clock: performanceClock, frames: animationFrames }}
      reducedMotion={reducedMotion.current}
      {saving}
    />
  {/key}
{/if}
