/** The overlaid controls' bar, in CSS pixels: its whole height and the fade above its content. */
export interface ControlsBar {
  readonly height: number;
  readonly fadeHeight: number;
}

/**
 * How far the player lifts captions (`SlideshowPlayer.captionInset`): above the bottom controls
 * while they show, so they never cover a caption; the fade above the controls may overlap it.
 */
export function captionInset(controlsVisible: boolean, bar: ControlsBar): number {
  return controlsVisible ? Math.max(0, bar.height - bar.fadeHeight) : 0;
}

/** How a new caption inset reaches the player: `captionInset` glides, `jumpCaptionInset` jumps. */
export function captionInsetMotion(context: {
  readonly firstPlacement: boolean;
  readonly reducedMotion: boolean;
}): "glide" | "jump" {
  return context.firstPlacement || context.reducedMotion ? "jump" : "glide";
}
