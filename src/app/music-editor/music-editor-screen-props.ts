import type { BetweenSongs, MusicTrim, PictureChanges } from "../../library/own-music";
import type { PictureLength } from "../../library/picture-length";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import type { SampleTrack, SampleTrackId } from "../../sample-music/sample-tracks";
import type { ListenState } from "./listen-preview";
import type { SongsBeatsStatus, SongsLoudnessStatus } from "./slideshow-times";
import type { SamplePreview } from "../sample-music/sample-preview";
import type { Toaster } from "../toast/toaster";
import type { PendingSong, SampleSongRow } from "./song-intake";

/** `MusicEditorScreen.svelte`'s props, split out to keep that file under the line limit. */
export interface MusicEditorScreenProps {
  slideshow: StoredSlideshow;
  /** The song edited; the first while none is chosen or the chosen one is gone. */
  selectedSongId: string | null;
  /** What is known of the songs' beats, updated as the background pass listens. */
  beats: SongsBeatsStatus;
  /** What is known of the songs' loudness, updated as the background pass listens (ADR-0040). */
  loudness: SongsLoudnessStatus;
  /** Fine peaks of the selected song's whole track, 0..1; null while it is decoded. */
  peaks: Float32Array | null;
  listening: ListenState | null;
  /** Picked files on their way into the playlist, or found unusable. */
  pending: readonly PendingSong[];
  /** Sample tracks downloading or failed; not yet in `slideshow.songs` (song-intake.ts). */
  sampleRows: readonly SampleSongRow[];
  /** `undefined` when the build turns sample music off (SAMPLE_MUSIC.md). */
  samplePreview?: SamplePreview | undefined;
  toaster: Toaster;
  onBack: () => void;
  onError: (error: unknown) => void;
  onSelectSong: (songId: string) => void;
  onAddSongs: (files: readonly File[]) => void;
  onRemoveSong: (songId: string) => void;
  onMoveSong: (songId: string, toIndex: number) => void;
  onDismissPending: (key: number) => void;
  onRemoveSampleRow: (trackId: SampleTrackId) => void;
  isSampleTrackAdded: (trackId: SampleTrackId) => boolean;
  onAddSampleTrack: (track: SampleTrack) => void;
  /** `undefined`: the songs crossfade. */
  onBetweenSongs: (between: BetweenSongs | undefined) => void;
  /** `undefined`: the whole track. */
  onTrim: (trim: MusicTrim | undefined) => void;
  /** `undefined`: automatic. */
  onFadeIn: (fadeMs: number | undefined) => void;
  onFadeOut: (fadeMs: number | undefined) => void;
  /** `undefined`: levelled. */
  onVolume: (volumeDb: number | undefined) => void;
  onVolumeReset: () => void;
  onListenVolume: () => void;
  onToggleOriginal: () => void;
  /** `undefined`: on the beat. */
  onPictureChanges: (changes: PictureChanges | undefined) => void;
  /** `undefined`: the pictures fill the music. */
  onPictureLength: (length: PictureLength | undefined) => void;
  onSecondsPerPicture: (seconds: number) => void;
  /** Leaves the slideshow's mood for its own picture times (MOOD.md). */
  onSetOwnPictureTimes: () => void;
  onListen: (kind: "start" | "end") => void;
  onStopListening: () => void;
  /** An edit is being stored. */
  saving: boolean;
}
