import type { Catalogue } from "./messages";
import type { deEditor } from "./catalogue-de-editor";

/** English copy of the picture editor; typed to the German keys. */
export const enEditor: Pick<Catalogue, keyof typeof deEditor> = {
  "units.zoom": "{zoom}×",
  "slideshow.edit": "Edit",
  "slideshow.ownMotionBadge": "own",
  "slideshow.pictureLabelOwnMotion": "Picture {number}, taken on {date}, own motion",
  "slideshow.automaticWithOwn": "automatic, {count} own",
  "editor.crumb": "Picture {number}",
  "editor.position": "Picture {number} of {count}",
  "editor.counter": "{number} / {count}",
  "editor.previous": "Previous picture",
  "editor.next": "Next picture",
  "editor.kenBurns": "Ken Burns",
  "editor.automatic": "Automatic",
  "editor.own": "Own motion",
  "editor.frames": "Frames",
  "editor.start": "Start",
  "editor.end": "End",
  "editor.zoom": "Zoom {zoom}",
  "editor.startFrame": "Start frame, zoom {zoom}",
  "editor.endFrame": "End frame, zoom {zoom}",
  "editor.editStartFrame": "Edit the start frame",
  "editor.editEndFrame": "Edit the end frame",
  "editor.playPreview": "Play preview",
  "editor.pausePreview": "Pause preview",
  "editor.previewTime": "{current} / {total}",
  "editor.swap": "Swap start and end",
  "editor.reset": "Back to automatic",
  "editor.alreadyAutomatic": "The motion is already automatic",
  "editor.motionAutomatic": "Motion back to automatic",
  "editor.hintWide":
    "Drag inside the frame to move it, drag a corner to zoom · mouse wheel zooms · arrow keys, + and −",
  "editor.hintNarrow": "Drag the frame to move it; corners or two fingers zoom.",
};
