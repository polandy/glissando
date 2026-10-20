import { composeSlideshow, NO_SONG_BEATS, NO_SONG_LOUDNESS } from "../compose";
import { withSongUrls } from "../export-player/page-data";
import type { PlayablePage } from "../export-player/page-player";
import type { GlissandoManifest } from "../glissando-file/glissando-manifest";
import { slideshowFromManifest } from "../glissando-file/slideshow-from-manifest";
import type { PictureFocus } from "../library/picture-focus";
import type { StoredSlideshow } from "../library/stored-slideshow";
import type { ShareSummary } from "../share-page/share-page-words";
import type { FolderSource } from "./folder-source";

/** The checked folder, ready to play, and what its start card sums up. */
export interface FolderShow {
  readonly title: string;
  readonly page: PlayablePage;
  readonly summary: ShareSummary;
}

/** The file holds no focus: the automatic motions aim at the middle. */
const NO_FOCUS: ReadonlyMap<string, PictureFocus> = new Map();
/** Stands in for the library's id; nothing here stores the slideshow. */
const FOLDER_SLIDESHOW_ID = "folder";

/**
 * `manifest`'s slideshow played from `folder`: every picture, song and clip known by its path in
 * the folder, composed as the app composes it, without focus or beats, which the file does not
 * hold (so picture changes are not snapped to the beat). Each song played is read once and made
 * a URL by `createUrl`; pictures and clips are read when the player asks for them.
 */
export async function folderShow(
  manifest: GlissandoManifest,
  folder: FolderSource,
  createUrl: (song: Blob) => string,
): Promise<FolderShow> {
  const { slideshow } = manifest;
  const stored: StoredSlideshow = {
    id: FOLDER_SLIDESHOW_ID,
    title: slideshow.title,
    createdAt: slideshow.createdAt,
    ...slideshowFromManifest(slideshow, {
      pictureIds: slideshow.pictures.map(({ file }) => file),
      songIds: slideshow.songs.map(({ file }) => file),
      clipIds: new Map(
        slideshow.pictures.flatMap(({ video }) =>
          video === undefined ? [] : [[video.file, video.file] as const],
        ),
      ),
    }),
  };
  const byPath = composeSlideshow(
    stored,
    { picture: (path) => path, music: (path) => path, video: (path) => path },
    NO_FOCUS,
    NO_SONG_BEATS,
    NO_SONG_LOUDNESS,
  );
  const played = [...new Set(byPath.music?.map(({ src }) => src))];
  const songs = new Map(
    await Promise.all(played.map(async (path) => [path, await read(folder, path)] as const)),
  );
  const composed = withSongUrls(byPath, songs, createUrl);
  return {
    title: slideshow.title,
    page: {
      slideshow: composed,
      openPicture: (path) => read(folder, path),
      readVideo: (path) => read(folder, path),
    },
    summary: {
      pictureCount: slideshow.pictures.length,
      durationMs: composed.slides.reduce((sum, { durationMs }) => sum + durationMs, 0),
      withMusic: composed.music !== undefined,
    },
  };
}

async function read(folder: FolderSource, path: string): Promise<Blob> {
  const file = await folder.read(path);
  if (file === null) throw new Error(`the slideshow's folder no longer holds ${path}`);
  return file;
}
