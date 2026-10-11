<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { BeatPass } from "../../library/beat-pass";
  import type { LibraryStore, StoredSlideshow } from "../../library/stored-slideshow";
  import type { BeatsStatus } from "../beats/music-beats-known";
  import { TrackBeats } from "../beats/track-beats";
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
    beatPass,
    audio,
    saving,
    onBack,
    onError,
    log,
  }: {
    store: Pick<LibraryStore, "musicBlob" | "musicBeats">;
    stored: StoredSlideshow;
    editor: SlideshowEditor;
    /** What it finds puts the automatic changes on the music's beats as it goes. */
    beatPass: Pick<BeatPass, "subscribe" | "listenFor">;
    audio: MusicEditorAudio;
    saving: boolean;
    onBack: () => void;
    onError: (error: unknown) => void;
    /** Logs beats that could not be read: the pictures share the music evenly meanwhile. */
    log: (error: unknown) => void;
  } = $props();

  let peaks = $state.raw<Float32Array | null>(null);
  let listening = $state.raw<ListenState | null>(null);
  let beats = $state.raw<BeatsStatus>({ kind: "listening" });
  let preview: ListenPreview | null = null;
  let musicUrl: string | null = null;
  const left = new AbortController();

  onMount(() => {
    const music = stored.music;
    if (music === undefined) {
      return;
    }
    const track = new TrackBeats(music.id, { store, pass: beatPass, log }, (status) => {
      beats = status;
    });
    // Music not listened to yet, e.g. a server slideshow's or one kept since the app opened, now.
    beatPass.listenFor(music.id);
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
    return () => track.dispose();
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
    {beats}
    {peaks}
    {listening}
    {onBack}
    onTrim={(trim) => editor.setMusicTrim(trim)}
    onFadeIn={(fadeMs) => editor.setMusicFadeIn(fadeMs)}
    onFadeOut={(fadeMs) => editor.setMusicFadeOut(fadeMs)}
    onPictureChanges={(changes) => editor.setMusicPictureChanges(changes)}
    onListen={(kind) => preview?.toggle(kind, musicEditorView(stored, beats).timing)}
    onStopListening={() => preview?.stop()}
    {saving}
  />
{/if}
