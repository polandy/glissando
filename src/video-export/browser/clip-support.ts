import type { ClipToDecode } from "../clip-check";
import type { OpenVideo } from "./clip-frames";
import { openClipFile } from "./open-clip";

/**
 * Whether this browser can decode the clip's video, and its sound when it is mixed in; a clip
 * without a sound track needs none.
 */
export async function canDecodeClip(
  { src, withSound }: ClipToDecode,
  openVideo: OpenVideo,
): Promise<boolean> {
  const clip = await openClipFile(await openVideo(src));
  if (clip === null) {
    return false;
  }
  try {
    const needsAudio = withSound && clip.audio !== null;
    const [video, audio] = await Promise.all([
      clip.video.canDecode(),
      needsAudio ? clip.audio?.canDecode() : true,
    ]);
    return video && audio === true;
  } finally {
    clip.dispose();
  }
}
