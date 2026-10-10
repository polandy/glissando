import { slideshowDurationMs } from "../../compose";
import { exportPage } from "../../html-export/export-page";
import { playerBundleBytes, type PageWeights } from "../../html-export/plan";
import type { PictureScaler, PlayerAsset } from "../../html-export/ports";
import type { LibraryStore, StoredSlideshow } from "../../library/stored-slideshow";
import { NO_FOCUS_KNOWN } from "../focus/pictures-focus";
import type { Translator } from "../i18n/translator";
import type { HtmlExportPorts, HtmlExportSubject, PageRun } from "./html-export-state";
import { HtmlExportSession } from "./html-export-session";
import { pageWords } from "./page-copy";

/** Everything the sheet needs of the browser; the run and the estimate depend on the slideshow. */
export type HtmlExportDevice = Omit<HtmlExportPorts, "weights" | "run"> & {
  readonly scaler: PictureScaler;
  readonly playerAsset: PlayerAsset;
};

/**
 * A sheet session exporting `stored` as it is now, in the translator's language at the time of
 * the run. The estimate takes each stored display picture's byte count from its Blob, which
 * storage knows without reading the bytes.
 */
export function slideshowHtmlExport(
  device: HtmlExportDevice,
  store: Pick<LibraryStore, "pictureBlob" | "musicBlob" | "pictureFocus">,
  stored: StoredSlideshow,
  translator: Translator,
): HtmlExportSession {
  const subject: HtmlExportSubject = {
    title: stored.title,
    durationMs: slideshowDurationMs(stored),
    withMusic: stored.music !== undefined,
    pictureCount: stored.pictures.length,
  };
  const weights = async (): Promise<PageWeights> => {
    const [pictures, musicBytes, bundle] = await Promise.all([
      Promise.all(
        stored.pictures.map(async ({ id, width, height }) => ({
          width,
          height,
          bytes: (await store.pictureBlob(id)).size,
        })),
      ),
      stored.music === undefined ? 0 : store.musicBlob(stored.music.id).then((blob) => blob.size),
      // Loading the bundle here also fetches it before "Webseite erstellen".
      device.playerAsset.load(),
    ]);
    return { pictures, musicBytes, pageBytes: playerBundleBytes(bundle) };
  };
  const run = async (job: PageRun): Promise<void> => {
    const focus = await store
      .pictureFocus(stored.pictures.map((picture) => picture.id))
      .catch((error: unknown) => {
        // Focus only aims the automatic motions: unread, they aim at the middle.
        device.log(error);
        return NO_FOCUS_KNOWN.found;
      });
    const words = pageWords(translator, subject);
    await exportPage({
      stored,
      focus,
      sizeId: job.sizeId,
      lang: words.lang,
      copy: words.copy,
      noscript: words.noscript,
      media: store,
      scaler: device.scaler,
      sink: job.sink,
      playerAsset: device.playerAsset,
      signal: job.signal,
      onProgress: (progress) => job.onProgress(progress),
    });
  };
  return new HtmlExportSession(subject, {
    weights,
    run,
    canPickSaveFile: () => device.canPickSaveFile(),
    pickDestination: (fileName) => device.pickDestination(fileName),
    memoryDestination: (fileName) => device.memoryDestination(fileName),
    canShare: (file) => device.canShare(file),
    share: (file) => device.share(file),
    download: (file) => device.download(file),
    openPage: (file) => device.openPage(file),
    log: (error) => device.log(error),
  });
}
