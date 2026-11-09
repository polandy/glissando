<script lang="ts">
  import type { TransitionChoice } from "../../library/own-timing";
  import type { EditorPreview } from "./editor-preview";
  import LayoutSection from "./LayoutSection.svelte";
  import type { MotionPreviewPorts } from "./motion-preview";
  import type { PictureEditorView } from "./picture-editor-view";
  import TimingSection from "./TimingSection.svelte";

  /**
   * The editor panel's timing and layout sections. A timing change shows the preview, where
   * the change plays.
   */
  let {
    picture,
    pictureUrl,
    nextPictureUrl,
    previewPorts,
    reducedMotion,
    editorPreview,
    showPreview,
    onDuration,
    onTransition,
    onResetTiming,
    onAlone,
  }: {
    picture: PictureEditorView;
    pictureUrl: string | null;
    nextPictureUrl: string | null;
    previewPorts: MotionPreviewPorts;
    reducedMotion: boolean;
    editorPreview: Pick<EditorPreview, "showTransition">;
    showPreview: () => void;
    onDuration: (durationMs: number) => void;
    onTransition: (choice: TransitionChoice) => void;
    onResetTiming: () => void;
    onAlone: (alone: boolean) => void;
  } = $props();
</script>

<TimingSection
  {picture}
  {pictureUrl}
  {nextPictureUrl}
  ports={previewPorts}
  {reducedMotion}
  onDuration={(durationMs) => {
    onDuration(durationMs);
    showPreview();
  }}
  onTransition={(choice) => {
    onTransition(choice);
    showPreview();
    editorPreview.showTransition(choice, picture);
  }}
  onReset={() => {
    onResetTiming();
    showPreview();
    editorPreview.showTransition(picture.transition.automatic, picture);
  }}
/>
<LayoutSection {picture} {onAlone} />
