<script lang="ts">
  import { onDestroy } from "svelte";
  import type { BeatPass } from "../../library/beat-pass";
  import type { LibraryStore, StoredSlideshow } from "../../library/stored-slideshow";
  import { PlaylistBeats } from "../beats/playlist-beats";
  import type { SlideshowEditor } from "../editing/slideshow-editor";
  import type { MusicEditorAudio } from "../music-editor/music-editor-audio";
  import { ListenPreview, type ListenState } from "../music-editor/listen-preview";
  import { musicEditorView, type SongsBeatsStatus } from "../music-editor/music-editor-view";
  import MusicEditorScreen from "../music-editor/MusicEditorScreen.svelte";
  import { SongIntake, type PendingSong, type SongIntakeDevice } from "../music-editor/song-intake";

  /** The music editor over the slideshow screen's editor: its edits are stored the same way. */
  let {
    store,
    stored,
    editor,
    beatPass,
    audio,
    songIntake,
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
    /** Reads picked songs and stores their audio where the slideshow lives. */
    songIntake: SongIntakeDevice;
    saving: boolean;
    onBack: () => void;
    onError: (error: unknown) => void;
    /** Logs beats that could not be read: the pictures share the music evenly meanwhile. */
    log: (error: unknown) => void;
  } = $props();

  let selectedSongId = $state<string | null>(null);
  let peaks = $state.raw<Float32Array | null>(null);
  let listening = $state.raw<ListenState | null>(null);
  let beats = $state.raw<SongsBeatsStatus>(new Map());
  let pending = $state.raw<readonly PendingSong[]>([]);
  /** The song edited: the one selected, or the playlist's first. */
  const song = $derived(
    stored.songs.find((candidate) => candidate.id === selectedSongId) ?? stored.songs[0],
  );
  const songIds = $derived(stored.songs.map(({ id }) => id));
  let preview: ListenPreview | null = null;

  // The ports are fixed for the route's lifetime.
  // svelte-ignore state_referenced_locally
  const playlistBeats = new PlaylistBeats({ store, pass: beatPass, log }, (status) => {
    beats = status;
  });
  // svelte-ignore state_referenced_locally
  const intake = new SongIntake({ ...songIntake, editor, onError }, (songs) => {
    pending = songs;
  });

  $effect(() => {
    playlistBeats.follow(songIds).catch(onError);
  });

  // The selected song's audio, for its waveform and listening; let go of when another is chosen.
  $effect(() => {
    const songId = song?.id;
    if (songId === undefined) return;
    const left = new AbortController();
    let musicUrl: string | null = null;
    peaks = null;
    store.musicBlob(songId).then((blob) => {
      if (left.signal.aborted) return;
      musicUrl = audio.createUrl(blob);
      preview = new ListenPreview(
        { clock: audio.clock, frames: audio.frames, music: audio.playback(musicUrl), onError },
        (state) => (listening = state),
      );
      audio.decodePeaks(blob).then((decoded) => {
        if (!left.signal.aborted) peaks = decoded;
      }, onError);
    }, onError);
    return () => {
      left.abort();
      preview?.dispose();
      preview = null;
      listening = null;
      if (musicUrl !== null) audio.revokeUrl(musicUrl);
    };
  });

  onDestroy(() => {
    playlistBeats.dispose();
    intake.dispose();
  });
</script>

<MusicEditorScreen
  slideshow={stored}
  selectedSongId={song?.id ?? null}
  {beats}
  {peaks}
  {listening}
  {pending}
  {onBack}
  onSelectSong={(songId) => (selectedSongId = songId)}
  onAddSongs={(files) => void intake.add(files)}
  onRemoveSong={(songId) => editor.removeSong(songId)}
  onMoveSong={(songId, toIndex) => editor.moveSong(songId, toIndex)}
  onDismissPending={(key) => intake.dismiss(key)}
  onBetweenSongs={(between) => editor.setBetweenSongs(between)}
  onTrim={(trim) => song !== undefined && editor.setMusicTrim(song.id, trim)}
  onFadeIn={(fadeMs) => song !== undefined && editor.setMusicFadeIn(song.id, fadeMs)}
  onFadeOut={(fadeMs) => song !== undefined && editor.setMusicFadeOut(song.id, fadeMs)}
  onPictureChanges={(changes) =>
    song !== undefined && editor.setMusicPictureChanges(song.id, changes)}
  onPictureLength={(length) => editor.setPictureLength(length)}
  onSecondsPerPicture={(seconds) => editor.setSecondsPerPicture(seconds)}
  onListen={(kind) =>
    song !== undefined && preview?.toggle(kind, musicEditorView(stored, beats, song.id).timing)}
  onStopListening={() => preview?.stop()}
  {saving}
/>
