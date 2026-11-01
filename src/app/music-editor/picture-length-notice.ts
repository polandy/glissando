import type { PlaylistView } from "./playlist-view";

/**
 * The gap between the music's end and the pictures' that turns the notice from neutral to a
 * warning, as a share of the slideshow: above a third, much of the slideshow plays in silence.
 */
const WARNING_GAP_DIVISOR = 3;

/** What the picture-length section's one line says about how the music meets the pictures. */
export type PictureLengthNotice =
  | { readonly kind: "music-ends-early"; readonly overMs: number; readonly tone: NoticeTone }
  | { readonly kind: "fitted"; readonly shareMs: number }
  | { readonly kind: "repeats"; readonly slideshowMs: number }
  | { readonly kind: "fades-out"; readonly slideshowMs: number }
  | { readonly kind: "ends-with-music"; readonly slideshowMs: number };

export type NoticeTone = "neutral" | "warning";

/** The parts of the playlist view the notice depends on. */
export type NoticeInput = Pick<
  PlaylistView,
  "slideshowMs" | "playlistMs" | "repeatMusic" | "fittedShareMs" | "overMs"
>;

/** Warning only above a third of the slideshow; the app handles a smaller gap calmly. */
function toneOfGap(overMs: number, slideshowMs: number): NoticeTone {
  return overMs * WARNING_GAP_DIVISOR > slideshowMs ? "warning" : "neutral";
}

export function pictureLengthNotice(input: NoticeInput): PictureLengthNotice {
  const { slideshowMs, playlistMs, repeatMusic, fittedShareMs, overMs } = input;
  if (repeatMusic) {
    return { kind: "repeats", slideshowMs };
  }
  if (overMs !== undefined) {
    return { kind: "music-ends-early", overMs, tone: toneOfGap(overMs, slideshowMs) };
  }
  if (fittedShareMs !== undefined) {
    return { kind: "fitted", shareMs: fittedShareMs };
  }
  if (slideshowMs < playlistMs) {
    return { kind: "fades-out", slideshowMs };
  }
  return { kind: "ends-with-music", slideshowMs };
}
