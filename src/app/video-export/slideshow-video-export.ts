import { composeSlideshow, slideshowDurationMs } from "../../compose";
import { DEFAULT_VIDEO_VOLUME } from "../../library/own-video";
import type { LibraryStore, StoredSlideshow } from "../../library/stored-slideshow";
import {
  canDecodeClip,
  clipsToDecode,
  firstUndecodableClip,
  runVideoExport,
} from "../../video-export";
import { storedSongBeats } from "../beats/music-beats-known";
import { NO_FOCUS_KNOWN } from "../focus/pictures-focus";
import type { ExportRun, VideoExportPorts } from "./export-sheet-state";
import { VideoExportSession } from "./video-export-session";

/** The export's preview is the canvas it draws each frame on. */
export type ExportPreview = CanvasImageSource;

/** Everything the sheet needs of the browser; the run itself depends on the slideshow. */
export type VideoExportDevice = Omit<VideoExportPorts<ExportPreview>, "run" | "undecodableClip">;

/**
 * A sheet session exporting `stored` as it is now. The run reads the focus and beats found so
 * far, each song and each picture by media id, as the player does.
 */
export function slideshowVideoExport(
  device: VideoExportDevice,
  store: Pick<
    LibraryStore,
    "pictureBlob" | "musicBlob" | "videoBlob" | "pictureFocus" | "musicBeats"
  >,
  stored: StoredSlideshow,
): VideoExportSession<ExportPreview> {
  const compose = async () => {
    const [focus, beats] = await Promise.all([
      store.pictureFocus(stored.pictures.map((picture) => picture.id)).catch((error: unknown) => {
        // Focus only aims the automatic motions: unread, they aim at the middle.
        device.log(error);
        return NO_FOCUS_KNOWN.found;
      }),
      storedSongBeats(store, stored, device.log),
    ]);
    // The export reads media by id, so the sources stay ids.
    return composeSlideshow(
      stored,
      { picture: (id) => id, music: (id) => id, video: (id) => id },
      focus,
      beats,
    );
  };
  const run = async (job: ExportRun<ExportPreview>) => {
    const slideshow = await compose();
    return runVideoExport({
      slideshow,
      openPicture: (id) => store.pictureBlob(id),
      openMusic: (id) => store.musicBlob(id),
      openVideo: (id) => store.videoBlob(id),
      preset: job.preset,
      audioCodec: job.audioCodec,
      target: job.target,
      signal: job.signal,
      onProgress: (progress, preview) => job.onProgress(progress, preview),
    });
  };
  const undecodableClip = async () => {
    if (!stored.pictures.some((picture) => picture.video !== undefined)) {
      return null;
    }
    const clips = clipsToDecode(await compose());
    return firstUndecodableClip(clips, (clip) => canDecodeClip(clip, (id) => store.videoBlob(id)));
  };
  return new VideoExportSession(
    {
      title: stored.title,
      durationMs: slideshowDurationMs(stored),
      withMusic: stored.songs.length > 0,
      withAudio:
        stored.songs.length > 0 ||
        stored.pictures.some(
          ({ video }) => video !== undefined && (video.volume ?? DEFAULT_VIDEO_VOLUME) > 0,
        ),
    },
    { ...device, run, undecodableClip },
  );
}
