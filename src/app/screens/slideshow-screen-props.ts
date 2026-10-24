import type { HtmlExportSession } from "../html-export/html-export-session";
import type { ExportPreview } from "../video-export/slideshow-video-export";
import type { VideoExportSession } from "../video-export/video-export-session";
import type { SlideshowDetails, SlideshowStorage, StorageAction } from "./view-models";
import type { ServerSlideshowRows } from "../server-library/server-slideshow-sessions";
import type { StoredCard } from "../../library/stored-slideshow";
import type { CardInput } from "../../library/stored-card";
import type { SlideshowTransition } from "../../library/own-timing";
import type { PortraitPictures } from "../../library/portrait-pictures";
import type { MotionPreviewPorts } from "../picture-editor/motion-preview";
import type { SlideshowMood } from "../../library/slideshow-mood";
import type { MoodPreviewPorts } from "./slideshow/mood-preview-ports";
import type { ExportMenuState } from "../glissando-file/export-menu";
import type { StripSelection } from "./slideshow/strip-selection";
import type { Scheduler } from "../../ui-kit/scheduler";
import type { FrameScheduler, SlideshowLook } from "../../player";
import type { SlideshowSearch } from "../../library/focus-pass";
import type { PicturesFocus } from "../focus/pictures-focus";
import type { ChapterSettingsEditor } from "../editing/chapter-settings-editor";

/** `SlideshowScreen`'s props: the slideshow's own screen, its pictures strip, the title slide
 * and closing slide sheets, and the export and delete flows reached from it. */
export interface SlideshowScreenProps {
  slideshow: SlideshowDetails;
  onBack: () => void;
  onPlay: () => void;
  /** "Add media" in the strip header. */
  onAddPictures: () => void;
  /** The pictures just added, marked as new while the screen is shown. */
  newPictureIds?: ReadonlySet<string>;
  /** The tile's own ✕: removes just that picture, never the rest of the selection. */
  onRemove: (pictureId: string) => void;
  /** Earlier/Later and Shift+arrows: moves the group by `offset` steps (ADR-0019). */
  onShiftGroup: (pictureIds: readonly string[], offset: number) => void;
  /** The selection bar's Remove, or Delete/Backspace on a focused (selected) tile. */
  onRemoveGroup: (pictureIds: readonly string[]) => void;
  /** "Shuffle" in the strip header: puts the pictures in a new random order. */
  onShuffle: () => void;
  /** A drop: moves the group to the slot before the tile at `insertion`. */
  onMoveGroup: (pictureIds: readonly string[], insertion: number) => void;
  onRename: (typed: string) => void;
  /** Opens the picture editor for a picture. */
  onEdit: (pictureId: string) => void;
  /** A picture as the slideshow will show it, for F's full-screen view. */
  loadPicture: (pictureId: string) => Promise<Blob>;
  onError: (error: unknown) => void;
  /** Opens the music editor; only offered with music. */
  onEditMusic: () => void;
  /** The slideshow's default transition was picked in its sheet. */
  onTransition: (transition: SlideshowTransition) => void;
  /** "Back to crossfade" in the transitions sheet. */
  onResetTransition: () => void;
  /** The slideshow's colour grade was picked in its sheet (ADR-0044). */
  onLook: (look: SlideshowLook) => void;
  /** "Back to None" in the look sheet. */
  onResetLook: () => void;
  /** The slideshow's tempo under its mood, for the info panel and the Mood sheet's "What it
   * sets" (ADR-0045); undefined without a mood, or without a clear beat to pace to. */
  moodBpm: number | undefined;
  /** Whether `moodBpm` may still change once analysis catches up; never "no beat found" then. */
  moodPending: boolean;
  /** The Mood sheet's live preview data ports; left out while it has no pictures. */
  moodPreviewPorts: MoodPreviewPorts;
  /** A mood tile was tapped: stores at once. */
  onMood: (mood: SlideshowMood | undefined) => void;
  /** "Back to Custom" in the Mood sheet. */
  onResetMood: () => void;
  /** The Mood sheet's "Follow the music's energy" switch (ADR-0046): stores at once. */
  onEnergyPacing: (on: boolean) => void;
  /** A choice was picked in the portrait pictures sheet. */
  onPortraitPictures: (choice: PortraitPictures) => void;
  /** "Back to automatic" in the portrait pictures sheet. */
  onResetPortraitPictures: () => void;
  /** Creates the title slide with its defaults, storing it at once. */
  onEnsureOpeningCard: () => StoredCard;
  onOpeningCard: (card: CardInput) => void;
  onRemoveOpeningCard: () => void;
  /** Creates the closing slide with its defaults, storing it at once. */
  onEnsureClosingCard: () => StoredCard;
  onClosingCard: (card: CardInput) => void;
  onRemoveClosingCard: () => void;
  /** The trip chapters editor (TRIP_CHAPTERS.md); null while importing. */
  chapterEditor: ChapterSettingsEditor | null;
  /** The transitions sheet's tiles loop on these. */
  previewPorts: MotionPreviewPorts;
  /** The transitions sheet's tiles stand still. */
  reducedMotion: boolean;
  /** The user confirmed deleting the whole slideshow. */
  onDelete: () => void;
  exportState: ExportMenuState;
  onExport: () => void;
  /** The ⋯ menu opened. */
  onMenuOpened: () => void;
  /** A video export of the slideshow as it is now, for the sheet "Save as video". */
  newVideoExport: () => VideoExportSession<ExportPreview>;
  /** A web page export of the slideshow as it is now, for the sheet "Save as web page". */
  newHtmlExport: () => HtmlExportSession;
  /** The primary pointer is a mouse (hovers, fine): a double-click opens a picture. */
  mousePointer: boolean;
  /** An edit is being stored. */
  saving: boolean;
  /** Where the slideshow lives; null while the server library is off. */
  storage?: SlideshowStorage | null;
  /** A server slideshow's link (share_link/IN_THE_APP.md); null for a device slideshow. */
  serverRows?: ServerSlideshowRows | null;
  onStorageAction: (action: StorageAction) => void;
  /** The selection bar acts on this; kept by the parent across the picture editor. */
  selection?: StripSelection;
  /** The strip's 450 ms touch hold; a real timeout by default, faked in tests. */
  holdScheduler?: Scheduler;
  /** The strip's auto-scroll frames; real `requestAnimationFrame` by default, faked in tests. */
  frameScheduler?: FrameScheduler;
  /** What is known of the pictures' focus, for the Focus menu entry and its sheet (ADR-0041). */
  focus: PicturesFocus;
  /** This slideshow's progress in the background focus pass; undefined once it has none to report. */
  focusSearch?: SlideshowSearch | undefined;
  /** The focus pass paused on a retryable error (ADR-0041): the Focus sheet says so, not "waiting". */
  focusPaused: boolean;
  /** The Focus sheet's "Try again"/"Look again at all" buttons. */
  onLookAgain: (pictureIds: readonly string[]) => void;
}
