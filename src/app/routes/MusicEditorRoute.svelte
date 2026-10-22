<script lang="ts">
  import { onDestroy } from "svelte";
  import type { BeatPass } from "../../library/beat-pass";
  import type { LoudnessPass } from "../../library/loudness-pass";
  import type { LibraryStore, StoredSlideshow } from "../../library/stored-slideshow";
  import { PlaylistBeats } from "../beats/playlist-beats";
  import { PlaylistLoudness } from "../loudness/playlist-loudness";
  import type { SlideshowEditor } from "../editing/slideshow-editor";
  import type { MusicEditorAudio } from "../music-editor/music-editor-audio";
  import { ListenPreview, type ListenState } from "../music-editor/listen-preview";
  import {
    musicEditorView,
    type SongsBeatsStatus,
    type SongsLoudnessStatus,
  } from "../music-editor/music-editor-view";
  import MusicEditorScreen from "../music-editor/MusicEditorScreen.svelte";
  import {
    SongIntake,
    type PendingSong,
    type SampleSongRow,
    type SongIntakeDevice,
  } from "../music-editor/song-intake";
  import type { SamplePreview } from "../sample-music/sample-preview";
  import type { Toaster } from "../toast/toaster";

  /** The music editor over the slideshow screen's editor: its edits are stored the same way. */
  let {
    store,
    stored,
    editor,
    beatPass,
    loudnessPass,
    audio,
    songIntake,
    samplePreview,
    toaster,
    saving,
    onBack,
    onError,
    log,
  }: {
    store: Pick<LibraryStore, "musicBlob" | "musicBeats" | "musicLoudness">;
    stored: StoredSlideshow;
    editor: SlideshowEditor;
    /** What it finds puts the automatic changes on the music's beats as it goes. */
    beatPass: Pick<BeatPass, "subscribe" | "listenFor">;
    /** What it finds levels each song as it goes (ADR-0040). */
    loudnessPass: Pick<LoudnessPass, "subscribe" | "listenFor">;
    audio: MusicEditorAudio;
    /** Reads picked songs and stores their audio where the slideshow lives. */
    songIntake: SongIntakeDevice;
    /** `undefined` when the build turns sample music off (SAMPLE_MUSIC.md). */
    samplePreview?: SamplePreview | undefined;
    toaster: Toaster;
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
  let loudness = $state.raw<SongsLoudnessStatus>(new Map());
  let pending = $state.raw<readonly PendingSong[]>([]);
  let sampleRows = $state.raw<readonly SampleSongRow[]>([]);
  /** The song edited: the one selected, or the playlist's first. */
  const song = $derived(
    stored.songs.find((candidate) => candidate.id === selectedSongId) ?? stored.songs[0],
  );
  const songIds = $derived(stored.songs.map(({ id }) => id));
  let preview: ListenPreview | null = null;
  /** Set as a volume listen's song changes, so the new song picks it straight back up. */
  let resumeVolumeListen: { readonly original: boolean } | null = null;
  /**
   * Mirrors `listening`'s "volume" case outside `$state`, so the song-loading effect's cleanup
   * reads it reliably even within the same flush that set it (its own `listening` read is not).
   */
  let activeVolumeListen: { readonly original: boolean } | null = null;

  // The ports are fixed for the route's lifetime.
  // svelte-ignore state_referenced_locally
  const playlistBeats = new PlaylistBeats({ store, pass: beatPass, log }, (status) => {
    beats = status;
  });
  // svelte-ignore state_referenced_locally
  const playlistLoudness = new PlaylistLoudness({ store, pass: loudnessPass, log }, (status) => {
    loudness = status;
  });
  // svelte-ignore state_referenced_locally
  const intake = new SongIntake(
    { ...songIntake, editor, onError },
    (songs) => {
      pending = songs;
    },
    (rows) => {
      sampleRows = rows;
    },
  );

  $effect(() => {
    playlistBeats.follow(songIds).catch(onError);
  });
  $effect(() => {
    playlistLoudness.follow(songIds).catch(onError);
  });

  // The selected song's audio, for its waveform and listening; let go of when another is chosen.
  $effect(() => {
    const songId = song?.id;
    if (songId === undefined) return;
    const resume = resumeVolumeListen;
    resumeVolumeListen = null;
    const left = new AbortController();
    let musicUrl: string | null = null;
    peaks = null;
    store.musicBlob(songId).then((blob) => {
      if (left.signal.aborted) return;
      musicUrl = audio.createUrl(blob);
      preview = new ListenPreview(
        { clock: audio.clock, frames: audio.frames, music: audio.playback(musicUrl), onError },
        (state) => {
          listening = state;
          activeVolumeListen =
            state?.kind === "volume" ? { original: state.original ?? false } : null;
        },
      );
      if (resume !== null) {
        const plan = musicEditorView(stored, beats, songId, loudness).volumeListen;
        preview.replaceVolume(plan, resume.original);
      }
      audio.decodePeaks(blob).then((decoded) => {
        if (!left.signal.aborted) peaks = decoded;
      }, onError);
    }, onError);
    return () => {
      // Tapping another song while listening at volume keeps comparing it (music.volumeListenCompare).
      resumeVolumeListen = activeVolumeListen;
      left.abort();
      preview?.dispose();
      preview = null;
      listening = null;
      activeVolumeListen = null;
      if (musicUrl !== null) audio.revokeUrl(musicUrl);
    };
  });

  onDestroy(() => {
    playlistBeats.dispose();
    playlistLoudness.dispose();
    intake.dispose();
  });
</script>

<MusicEditorScreen
  slideshow={stored}
  selectedSongId={song?.id ?? null}
  {beats}
  {loudness}
  {peaks}
  {listening}
  {pending}
  {sampleRows}
  {samplePreview}
  {toaster}
  {onBack}
  {onError}
  onSelectSong={(songId) => (selectedSongId = songId)}
  onAddSongs={(files) => void intake.add(files)}
  onRemoveSong={(songId) => editor.removeSong(songId)}
  onMoveSong={(songId, toIndex) => editor.moveSong(songId, toIndex)}
  onDismissPending={(key) => intake.dismiss(key)}
  onRemoveSampleRow={(trackId) => intake.removeSampleTrack(trackId)}
  isSampleTrackAdded={(trackId) => intake.isSampleTrackAdded(trackId)}
  onAddSampleTrack={(track) => intake.addSampleTrack(track)}
  onBetweenSongs={(between) => editor.setBetweenSongs(between)}
  onTrim={(trim) => song !== undefined && editor.setMusicTrim(song.id, trim)}
  onFadeIn={(fadeMs) => song !== undefined && editor.setMusicFadeIn(song.id, fadeMs)}
  onFadeOut={(fadeMs) => song !== undefined && editor.setMusicFadeOut(song.id, fadeMs)}
  onVolume={(volumeDb) => song !== undefined && editor.setMusicVolume(song.id, volumeDb)}
  onVolumeReset={() => song !== undefined && editor.setMusicVolume(song.id, undefined)}
  onPictureChanges={(changes) =>
    song !== undefined && editor.setMusicPictureChanges(song.id, changes)}
  onPictureLength={(length) => editor.setPictureLength(length)}
  onSecondsPerPicture={(seconds) => editor.setSecondsPerPicture(seconds)}
  onListen={(kind) =>
    song !== undefined && preview?.toggle(kind, musicEditorView(stored, beats, song.id).timing)}
  onListenVolume={() =>
    song !== undefined &&
    preview?.toggleVolume(musicEditorView(stored, beats, song.id, loudness).volumeListen)}
  onToggleOriginal={() => {
    if (listening?.kind === "volume") preview?.setOriginal(!(listening.original ?? false));
  }}
  onStopListening={() => preview?.stop()}
  {saving}
/>
