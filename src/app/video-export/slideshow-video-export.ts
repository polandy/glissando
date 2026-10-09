import { composeSlideshow, slideshowDurationMs } from "../../compose";
import type { LibraryStore, StoredSlideshow } from "../../library/stored-slideshow";
import { runVideoExport } from "../../video-export";
import { NO_FOCUS_KNOWN } from "../focus/pictures-focus";
import type { ExportRun, VideoExportPorts } from "./export-sheet-state";
import { VideoExportSession } from "./video-export-session";

/** The export's preview is the canvas it draws each frame on. */
export type ExportPreview = CanvasImageSource;

/** Everything the sheet needs of the browser; the run itself depends on the slideshow. */
export type VideoExportDevice = Omit<VideoExportPorts<ExportPreview>, "run">;

/**
 * A sheet session exporting `stored` as it is now. The run reads the focus found so far, the
 * music and each picture by media id, as the player does.
 */
export function slideshowVideoExport(
  device: VideoExportDevice,
  store: Pick<LibraryStore, "pictureBlob" | "musicBlob" | "pictureFocus">,
  stored: StoredSlideshow,
): VideoExportSession<ExportPreview> {
  const run = async (job: ExportRun<ExportPreview>) => {
    const [focus, musicFile] = await Promise.all([
      store.pictureFocus(stored.pictures.map((picture) => picture.id)).catch((error: unknown) => {
        // Focus only aims the automatic motions: unread, they aim at the middle.
        device.log(error);
        return NO_FOCUS_KNOWN.found;
      }),
      stored.music === undefined ? null : store.musicBlob(stored.music.id),
    ]);
    // The export reads media by id, so the sources stay ids.
    const slideshow = composeSlideshow(stored, { picture: (id) => id, music: (id) => id }, focus);
    return runVideoExport({
      slideshow,
      openPicture: (id) => store.pictureBlob(id),
      musicFile,
      preset: job.preset,
      audioCodec: job.audioCodec,
      target: job.target,
      signal: job.signal,
      onProgress: (progress, preview) => job.onProgress(progress, preview),
    });
  };
  return new VideoExportSession(
    {
      title: stored.title,
      durationMs: slideshowDurationMs(stored),
      withMusic: stored.music !== undefined,
    },
    { ...device, run },
  );
}
