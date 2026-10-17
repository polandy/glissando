import type { StoredSlideshow } from "../../library/stored-slideshow";
import type { BeatPass } from "../../library/beat-pass";
import type { FocusPass } from "../../library/focus-pass";
import type { SlideshowHome } from "./slideshow-storage";
import type { RouteStore } from "./slideshow-home";
import type { ExportProgress } from "../glissando-file/export-job";
import type { Toaster } from "../toast/toaster";
import type { ReadClipPeaks } from "../clip-editor/clip-sound-wave";
import type { MusicEditorAudio } from "../music-editor/music-editor-audio";
import type { MusicOutput, VideoElementPool } from "../../player";
import type { SongIntakeDevice } from "../music-editor/song-intake";
import type { PlaybackQuality } from "../settings/playback-quality";
import type { VideoExportDevice } from "../video-export/slideshow-video-export";
import type { HtmlExportDevice } from "../html-export/slideshow-html-export";
import type { ServerSlideshowSessions } from "../server-library/server-slideshow-sessions";

/** `SlideshowRoute`'s props: the slideshow screen plus the picture editor, music editor and player
 * it can switch to in place of it. */
export interface SlideshowRouteProps {
  /** Where the slideshow lives; a server slideshow's store spares no media and measures none. */
  store: RouteStore;
  home: SlideshowHome;
  /** The server library is on: a device slideshow's screen tells where its pictures are from. */
  serverOn: boolean;
  /** "Keep a copy on this device" of a server slideshow, as shown. */
  onKeepCopy: (slideshow: StoredSlideshow) => void;
  /** "Save on the server" of a device slideshow, as shown. */
  onSaveOnServer: (slideshow: StoredSlideshow) => void;
  /** A server slideshow's share link and "Show on TV" rows (share_link/, tv_remote/). */
  serverSessions: Pick<ServerSlideshowSessions, "newShareLinkSession" | "newTvSession">;
  /** What it finds updates the editors' automatic motions and focus marks as it goes. */
  focusPass: Pick<FocusPass, "state" | "subscribe">;
  /** What it finds puts the editors' automatic changes on the music's beats as it goes. */
  beatPass: Pick<BeatPass, "subscribe" | "listenFor">;
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
  /** The quality a server slideshow plays in on this device. */
  playbackQuality: PlaybackQuality;
  /** The picture editor is open on this picture, in place of the screen. */
  editingPictureId: string | null;
  /** The music editor is open, in place of the screen. */
  editingMusic: boolean;
  musicAudio: MusicEditorAudio;
  /** Where the player's music sounds. */
  musicOutput: MusicOutput;
  /** Gesture-blessed `<video>` elements a clip's sound can reuse on iPadOS Safari (ADR-0035). */
  videoElementPool: VideoElementPool;
  /** Reads a video clip's sound into the waveform the clip editor shows. */
  readClipPeaks: ReadClipPeaks;
  /** Reads songs picked in the music editor and stores their audio where the slideshow lives. */
  songIntake: SongIntakeDevice;
  /** Also taken when the slideshow is no longer on this device. */
  onBack: () => void;
  onPlay: () => void;
  /** "Add media", with the slideshow as shown. */
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
}
