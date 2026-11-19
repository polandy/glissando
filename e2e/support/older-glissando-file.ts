import { readFileSync } from "node:fs";
import { zipWith } from "../../src/glissando-file/testing/glissando-fixtures";
import { silentWav } from "../../src/import/testing/silent-wav";
import { blobFile, type TestFile } from "./media";
import { tinyPng } from "./real-glissando-file";

/** The first format version with video slides (ADR-0034); its fixture is what version 14 wrote. */
const VIDEO_FORMAT_FIXTURE = new URL(
  "../../src/glissando-file/testing/format-versions/format-14.json",
  import.meta.url,
);
const SONG_MS = 500;
const PICTURE_SIZE = { width: 40, height: 30 } as const;

interface FixtureSlideshow {
  pictures: { video?: { sourceMs: number; startMs: number; endMs: number } }[];
  songs: { file: string; mimeType: string; durationMs: number; trim?: unknown }[];
}

/**
 * The format-version-14 fixture with real, decodable media: the manifest keeps its own fields and
 * only the numbers a decode checks (the clip's length, the song's length) are set to the media's.
 */
export async function olderFileWithClip(
  clip: TestFile,
  clipMs: number,
  name: string,
): Promise<TestFile> {
  const manifest = JSON.parse(new TextDecoder().decode(readFileSync(VIDEO_FORMAT_FIXTURE))) as {
    slideshow: FixtureSlideshow;
  };
  const { pictures, songs } = manifest.slideshow;
  const video = pictures[0]?.video;
  const song = songs[0];
  if (video === undefined || song === undefined) {
    throw new Error("the version 14 fixture should hold a clip and a song");
  }
  Object.assign(video, { sourceMs: clipMs, startMs: 0, endMs: clipMs });
  Object.assign(song, {
    file: "music/track-1.wav",
    mimeType: "audio/wav",
    durationMs: SONG_MS,
  });
  delete song.trim;
  const picture = new Blob([tinyPng(PICTURE_SIZE.width, PICTURE_SIZE.height)], {
    type: "image/png",
  });
  const file = await zipWith({
    "glissando.json": JSON.stringify(manifest),
    "pictures/0001.png": picture,
    "thumbnails/0001.png": picture,
    "pictures/0002.png": picture,
    "thumbnails/0002.png": picture,
    "videos/clip-1.mp4": new Blob([clip.buffer as BlobPart], { type: clip.mimeType }),
    "music/track-1.wav": new Blob([silentWav(SONG_MS)], { type: "audio/wav" }),
  });
  return blobFile(name, file);
}
