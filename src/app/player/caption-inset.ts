/** The overlaid controls' bar, in CSS pixels: its whole height and the fade above its content. */
export interface ControlsBar {
  readonly height: number;
  readonly fadeHeight: number;
}

/**
 * How far the player lifts captions (`SlideshowPlayer.captionInset`): above the bottom controls
 * while they show, so they never cover a caption; the fade above the controls may overlap it.
 * Never below `safeAreaBottom` (CSS `env(safe-area-inset-bottom)`), so a caption clears a phone's
 * home indicator; the controls' bar already pads itself by it.
 */
export function captionInset(
  controlsVisible: boolean,
  bar: ControlsBar,
  safeAreaBottom: number,
): number {
  const aboveControls = controlsVisible ? bar.height - bar.fadeHeight : 0;
  return Math.max(safeAreaBottom, aboveControls, 0);
}

/** How a new caption inset reaches the player: `captionInset` glides, `jumpCaptionInset` jumps. */
export function captionInsetMotion(context: {
  readonly firstPlacement: boolean;
  readonly reducedMotion: boolean;
}): "glide" | "jump" {
  return context.firstPlacement || context.reducedMotion ? "jump" : "glide";
}
