<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { LibraryStore, StoredSlideshow } from "../../library/stored-slideshow";
  import type { SlideshowEditor } from "../editing/slideshow-editor";
  import type { MusicEditorAudio } from "../music-editor/music-editor-audio";
  import { ListenPreview, type ListenState } from "../music-editor/listen-preview";
  import { musicEditorView } from "../music-editor/music-editor-view";
  import MusicEditorScreen from "../music-editor/MusicEditorScreen.svelte";

  /** The music editor over the slideshow screen's editor: its edits are stored the same way. */
  let {
    store,
    stored,
    editor,
    audio,
    saving,
    onBack,
    onError,
  }: {
    store: Pick<LibraryStore, "musicBlob">;
    stored: StoredSlideshow;
    editor: SlideshowEditor;
    audio: MusicEditorAudio;
    saving: boolean;
    onBack: () => void;
    onError: (error: unknown) => void;
  } = $props();

  let peaks = $state.raw<Float32Array | null>(null);
  let listening = $state.raw<ListenState | null>(null);
  let preview: ListenPreview | null = null;
  let musicUrl: string | null = null;
  const left = new AbortController();

  onMount(() => {
    const music = stored.music;
    if (music === undefined) {
      return;
    }
    store.musicBlob(music.id).then((blob) => {
      if (left.signal.aborted) {
        return;
      }
      musicUrl = audio.createUrl(blob);
      preview = new ListenPreview(
        { clock: audio.clock, frames: audio.frames, music: audio.playback(musicUrl), onError },
        (state) => (listening = state),
      );
      audio.decodePeaks(blob).then((decoded) => {
        if (!left.signal.aborted) {
          peaks = decoded;
        }
      }, onError);
    }, onError);
  });
  onDestroy(() => {
    left.abort();
    preview?.dispose();
    if (musicUrl !== null) {
      audio.revokeUrl(musicUrl);
    }
  });
  // Music removed meanwhile, e.g. in another tab, has nothing left to edit.
  $effect(() => {
    if (stored.music === undefined) {
      onBack();
    }
  });
</script>

{#if stored.music !== undefined}
  <MusicEditorScreen
    slideshow={stored}
    {peaks}
    {listening}
    {onBack}
    onTrim={(trim) => editor.setMusicTrim(trim)}
    onFadeIn={(fadeMs) => editor.setMusicFadeIn(fadeMs)}
    onFadeOut={(fadeMs) => editor.setMusicFadeOut(fadeMs)}
    onListen={(kind) => preview?.toggle(kind, musicEditorView(stored).timing)}
    onStopListening={() => preview?.stop()}
    {saving}
  />
{/if}
