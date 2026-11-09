import { SlideshowNotFoundError } from "../../library/library-store";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import type { SlideshowEditor } from "../editing/slideshow-editor";
import type { Translator } from "../i18n/translator";
import { loadSlideshowScreen } from "./route-loading";
import { createScreenEditor, type ScreenEditorPorts } from "./screen-editor";
import type { ScreenFocus } from "./screen-focus.svelte";
import type { ScreenThumbnails } from "./screen-thumbnails.svelte";

/** What the slideshow screen hands its loaded slideshow: where it comes from and who is told. */
export interface ScreenSlideshowPorts {
  readonly store: ScreenEditorPorts["store"] & Parameters<typeof loadSlideshowScreen>[0];
  readonly slideshowId: string;
  readonly translator: Translator;
  readonly thumbnails: Pick<ScreenThumbnails, "urls">;
  readonly focus: Pick<ScreenFocus, "current" | "load">;
  readonly editorPorts: Omit<ScreenEditorPorts, "store" | "focusOf">;
  /** The pictures just added, whose adding the editor offers to undo. */
  readonly addedPictureIds: readonly string[];
  readonly onBack: () => void;
  readonly onError: (error: unknown) => void;
  /** Aborted once the screen is left. */
  readonly left: AbortSignal;
}

/** The slideshow the screen shows: stored as loaded and as edited since, with its editor. */
export class ScreenSlideshow {
  stored = $state.raw<StoredSlideshow | null>(null);
  editor = $state.raw<SlideshowEditor | null>(null);
  saving = $state(false);
  readonly #ports: ScreenSlideshowPorts;

  constructor(ports: ScreenSlideshowPorts) {
    this.#ports = ports;
  }

  /** Loads the slideshow and opens its editor; a slideshow gone leaves the screen. */
  load(): void {
    const { store, slideshowId, thumbnails, translator, focus, left } = this.#ports;
    loadSlideshowScreen(store, slideshowId, thumbnails.urls, translator.language, left).then(
      (loaded) => {
        if (loaded === null) return;
        focus.load(loaded.stored);
        this.stored = loaded.stored;
        const editor = createScreenEditor(
          loaded.stored,
          {
            ...this.#ports.editorPorts,
            store,
            focusOf: (pictureId) => focus.current.found.get(pictureId),
          },
          translator,
        );
        this.editor = editor;
        editor.subscribe((edited) => (this.stored = edited));
        editor.subscribeSaving((isSaving) => (this.saving = isSaving));
        if (this.#ports.addedPictureIds.length > 0) {
          editor.offerAddUndo(this.#ports.addedPictureIds);
        }
      },
      (error: unknown) => {
        if (error instanceof SlideshowNotFoundError) this.#ports.onBack();
        else this.#ports.onError(error);
      },
    );
  }

  dispose(): void {
    this.editor?.dispose();
  }
}
