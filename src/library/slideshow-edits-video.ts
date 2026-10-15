import {
  checkVideoExcerpt,
  checkVideoVolume,
  MAX_VIDEO_EXCERPT_MS,
  type StoredVideo,
} from "./own-video";
import type { StoredPicture, StoredSlideshow } from "./stored-slideshow";

/**
 * The editing of a video slide's clip (ADR-0034): excerpt, volume and whether the music ducks.
 * Pure functions over the stored record; the caller stores the result. Each throws for a picture
 * that is not in the slideshow or holds no video.
 */

type MutableVideo = { -readonly [Key in keyof StoredVideo]: StoredVideo[Key] };

/** Plays the clip from `startMs` to `endMs`, which is then the slide's duration. */
export function setVideoExcerpt(
  slideshow: StoredSlideshow,
  pictureId: string,
  startMs: number,
  endMs: number,
): StoredSlideshow {
  return editVideo(slideshow, pictureId, (video, where) => ({
    ...video,
    ...checkVideoExcerpt({ sourceMs: video.sourceMs, startMs, endMs }, where),
  }));
}

/** 0 to 100 in steps of 5, 0 being sound off; `undefined` makes it full volume again. */
export function setVideoVolume(
  slideshow: StoredSlideshow,
  pictureId: string,
  volume: number | undefined,
): StoredSlideshow {
  return editVideo(slideshow, pictureId, (video, where) => {
    delete video.volume;
    return volume === undefined ? video : { ...video, volume: checkVideoVolume(volume, where) };
  });
}

/** `false` lets the music keep its volume while the clip plays; `true` makes ducking automatic. */
export function setVideoDuckMusic(
  slideshow: StoredSlideshow,
  pictureId: string,
  duckMusic: boolean,
): StoredSlideshow {
  return editVideo(slideshow, pictureId, (video) => {
    delete video.duckMusic;
    return duckMusic ? video : { ...video, duckMusic: false };
  });
}

function editVideo(
  slideshow: StoredSlideshow,
  pictureId: string,
  edit: (video: MutableVideo, where: string) => StoredVideo,
): StoredSlideshow {
  const where = `picture "${pictureId}"`;
  const picture = slideshow.pictures.find((candidate) => candidate.id === pictureId);
  if (picture?.video === undefined) {
    throw new Error(`slideshow "${slideshow.id}" holds no video picture "${pictureId}"`);
  }
  const edited: StoredPicture = { ...picture, video: edit({ ...picture.video }, where) };
  return {
    ...slideshow,
    pictures: slideshow.pictures.map((other) => (other === picture ? edited : other)),
  };
}

/** The clip as import made it: its first `MAX_VIDEO_EXCERPT_MS` from the start, full sound, music ducked. */
export function resetVideoClip(slideshow: StoredSlideshow, pictureId: string): StoredSlideshow {
  const video = slideshow.pictures.find((picture) => picture.id === pictureId)?.video;
  if (video === undefined) {
    throw new Error(`slideshow "${slideshow.id}" holds no video picture "${pictureId}"`);
  }
  const endMs = Math.min(video.sourceMs, MAX_VIDEO_EXCERPT_MS);
  return setVideoDuckMusic(
    setVideoVolume(setVideoExcerpt(slideshow, pictureId, 0, endMs), pictureId, undefined),
    pictureId,
    true,
  );
}
