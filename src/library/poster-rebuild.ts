import type { LibraryStore, PictureBlobs } from "./library-store";
import { GREY_PICTURE_COLOURS, pictureColours, type RgbPixel } from "./picture-colours";
import type { StoredPicture, StoredSlideshow } from "./stored-slideshow";

/** A channel above this is a drawn picture, not the black of a frame never painted. */
export const BLACK_CHANNEL_CEILING = 16;

/** Whether every sampled pixel is black: no colour channel above `BLACK_CHANNEL_CEILING`. */
function isBlackPicture(pixels: readonly RgbPixel[]): boolean {
  return (
    pixels.length > 0 &&
    pixels.every(
      ({ r, g, b }) =>
        r <= BLACK_CHANNEL_CEILING && g <= BLACK_CHANNEL_CEILING && b <= BLACK_CHANNEL_CEILING,
    )
  );
}

/** A clip's poster decoded the way an import decodes it. */
export interface RebuiltPoster extends PictureBlobs {
  readonly width: number;
  readonly height: number;
}

/** What `rebuildBlackPosters` reads, decodes and writes with. */
export interface PosterRebuildPorts {
  readonly store: Pick<
    LibraryStore,
    "listSlideshows" | "pictureBlob" | "videoBlob" | "putPicture" | "updateSlideshowWith"
  >;
  /** A stored picture's pixels, sampled as for `pictureColours`. */
  pixels(blob: Blob): Promise<readonly RgbPixel[]>;
  /** The poster of the clip `fileName` as an import makes it: its first frame, downscaled. */
  poster(clip: Blob, fileName: string): Promise<RebuiltPoster>;
  /** The pictures whose poster changed, so their focus is looked for again; never empty. */
  onRebuilt(pictureIds: readonly string[]): void;
  log(error: unknown): void;
}

/** What a rebuilt poster changes in the picture's record. */
type PosterRecord = Pick<StoredPicture, "width" | "height" | "colours">;

/**
 * Rebuilds, from the stored clip, the poster of every video slide whose stored poster is black
 * (WebKit paints an unseeked `<video>` into a canvas black, see `clip-poster.ts`). Only a poster
 * with the grey colours of an all-black picture is read; one whose clip starts black too is kept.
 * A picture that fails is logged and left for the next start.
 */
export async function rebuildBlackPosters(ports: PosterRebuildPorts): Promise<void> {
  const slideshows = await ports.store.listSlideshows();
  const rebuilt = new Map<string, PosterRecord>();
  const looked = new Set<string>();
  for (const picture of slideshows.flatMap(({ pictures }) => pictures)) {
    if (looked.has(picture.id) || !mayHaveBlackPoster(picture)) {
      continue;
    }
    looked.add(picture.id);
    try {
      const record = await rebuildIfBlack(picture, picture.video.mediaId, ports);
      if (record !== null) {
        rebuilt.set(picture.id, record);
      }
    } catch (error) {
      ports.log(error);
    }
  }
  if (rebuilt.size === 0) {
    return;
  }
  for (const slideshow of slideshows) {
    if (slideshow.pictures.some(({ id }) => rebuilt.has(id))) {
      await ports.store
        .updateSlideshowWith(slideshow.id, (current) => withPosters(current, rebuilt))
        .catch(ports.log);
    }
  }
  ports.onRebuilt([...rebuilt.keys()]);
}

function mayHaveBlackPoster(
  picture: StoredPicture,
): picture is StoredPicture & Required<Pick<StoredPicture, "video">> {
  return (
    picture.video !== undefined &&
    picture.colours.veil === GREY_PICTURE_COLOURS.veil &&
    picture.colours.accent === GREY_PICTURE_COLOURS.accent
  );
}

/** The new record of `picture` once its black poster is replaced; null when it stays. */
async function rebuildIfBlack(
  picture: StoredPicture,
  clipMediaId: string,
  ports: PosterRebuildPorts,
): Promise<PosterRecord | null> {
  if (!isBlackPicture(await ports.pixels(await ports.store.pictureBlob(picture.id)))) {
    return null;
  }
  const poster = await ports.poster(await ports.store.videoBlob(clipMediaId), picture.fileName);
  const pixels = await ports.pixels(poster.display);
  if (isBlackPicture(pixels)) {
    return null;
  }
  await ports.store.putPicture(picture.id, {
    display: poster.display,
    thumbnail: poster.thumbnail,
  });
  return { width: poster.width, height: poster.height, colours: pictureColours(pixels) };
}

function withPosters(
  slideshow: StoredSlideshow,
  rebuilt: ReadonlyMap<string, PosterRecord>,
): StoredSlideshow {
  return {
    ...slideshow,
    pictures: slideshow.pictures.map((picture) => {
      const record = rebuilt.get(picture.id);
      return record === undefined ? picture : { ...picture, ...record };
    }),
  };
}
