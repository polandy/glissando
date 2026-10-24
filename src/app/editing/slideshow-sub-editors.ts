import type { StoredSlideshow } from "../../library/stored-slideshow";
import { CardSettingsEditor } from "./card-settings-editor";
import { ChapterSettingsEditor } from "./chapter-settings-editor";
import type { EditorUndos } from "./editor-undos";
import { LookSettingsEditor } from "./look-settings-editor";
import { MoodSettingsEditor } from "./mood-settings-editor";
import { MusicSettingsEditor } from "./music-settings-editor";
import { PictureListEditor } from "./picture-list-editor";
import { PictureSettingsEditor } from "./picture-settings-editor";
import type { SlideshowEditorPorts } from "./slideshow-editor-ports";
import { VideoSettingsEditor } from "./video-settings-editor";

/** Every sub-editor `SlideshowEditor` delegates to, wired to the same slideshow and undos. */
export interface SlideshowSubEditors {
  readonly pictureSettings: PictureSettingsEditor;
  readonly pictureList: PictureListEditor;
  readonly musicSettings: MusicSettingsEditor;
  readonly cardSettings: CardSettingsEditor;
  readonly video: VideoSettingsEditor;
  readonly chapters: ChapterSettingsEditor;
  readonly look: LookSettingsEditor;
  readonly mood: MoodSettingsEditor;
}

/** Builds `SlideshowEditor`'s sub-editors, each reading and applying through the same closures. */
export function createSubEditors(
  ports: SlideshowEditorPorts,
  undos: EditorUndos,
  current: () => StoredSlideshow,
  apply: (slideshow: StoredSlideshow) => void,
): SlideshowSubEditors {
  return {
    pictureSettings: new PictureSettingsEditor(ports, undos.reset, current, apply),
    pictureList: new PictureListEditor(ports, undos, current, apply),
    musicSettings: new MusicSettingsEditor(undos.songRemoval, ports, undos.reset, current, apply),
    cardSettings: new CardSettingsEditor(ports, current, apply),
    video: new VideoSettingsEditor(current, apply),
    chapters: new ChapterSettingsEditor(current, apply),
    look: new LookSettingsEditor(ports, undos.reset, current, apply),
    mood: new MoodSettingsEditor(ports, undos.reset, current, apply),
  };
}
