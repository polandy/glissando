import type { LibraryStore } from "../../../library/library-store";
import type { StoredSlideshow } from "../../../library/stored-slideshow";
import type { DecodeClipSound, MusicOutput } from "../../../player";

/**
 * What the Mood sheet's live preview (`MoodPreview.svelte`) needs to load and play the
 * slideshow's first slide units itself, the way `PlayerLayer` loads the real player.
 */
export interface MoodPreviewPorts {
  readonly store: Pick<
    LibraryStore,
    | "playbackPictureBlob"
    | "videoBlob"
    | "musicBlob"
    | "pictureFocus"
    | "musicBeats"
    | "musicLoudness"
  >;
  readonly stored: StoredSlideshow;
  readonly musicOutput: MusicOutput;
  readonly decodeClipSound: DecodeClipSound;
  /** Logs a focus, beats or loudness that could not be read: the preview plays on without them. */
  readonly log: (error: unknown) => void;
}
