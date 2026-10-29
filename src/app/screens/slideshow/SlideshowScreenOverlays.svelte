<script lang="ts">
  import type { PicturesFocus } from "../../focus/pictures-focus";
  import type { SlideshowSearch } from "../../../library/focus-pass";
  import type { ExportOutcome } from "../../glissando-file/export-job";
  import type { ExportMenuState } from "../../glissando-file/export-menu";
  import type { HtmlExportSession } from "../../html-export/html-export-session";
  import type { ShareLinkSession } from "../../share-link/share-link-session";
  import type { ExportPreview } from "../../video-export/slideshow-video-export";
  import type { VideoExportSession } from "../../video-export/video-export-session";
  import type { SlideshowDetails, SlideshowStorage } from "../view-models";
  import ShareFlow from "./share/ShareFlow.svelte";
  import FocusSheetHost from "./FocusSheetHost.svelte";
  import DeleteFlow from "./DeleteFlow.svelte";

  /**
   * The slideshow screen's modal overlays that are not part of its editing sheets: export,
   * focus and delete. Grouped apart from `SlideshowEditSheets` only to keep `SlideshowScreen`
   * under its line limit; each overlay's open button gives focus back through `onClosed`.
   */
  let {
    slideshow,
    storage,
    focus,
    focusSearch,
    focusPaused,
    onEdit,
    onLookAgain,
    linkSession,
    exportState,
    onExport,
    onShareOpened,
    newVideoExport,
    newHtmlExport,
    onDelete,
    onClosed,
    onShareClosed,
  }: {
    slideshow: SlideshowDetails;
    storage: SlideshowStorage | null;
    focus: PicturesFocus;
    focusSearch: SlideshowSearch | undefined;
    focusPaused: boolean;
    onEdit: (pictureId: string) => void;
    onLookAgain: (pictureIds: readonly string[]) => void;
    /** A server slideshow's link; null for a device slideshow. */
    linkSession: ShareLinkSession | null;
    exportState: ExportMenuState;
    onExport: () => Promise<ExportOutcome>;
    /** The Share sheet opened: the Glissando file's size is due. */
    onShareOpened: () => void;
    newVideoExport: () => VideoExportSession<ExportPreview>;
    newHtmlExport: () => HtmlExportSession;
    onDelete: () => void;
    /** An overlay closed without acting further; focus goes back to the button it opened from. */
    onClosed: () => void;
    /** The Share sheet closed; focus goes back to the Share button. */
    onShareClosed: () => void;
  } = $props();

  let shareFlow = $state<ShareFlow>();
  let focusSheetHost = $state<FocusSheetHost>();
  let deleteFlow = $state<DeleteFlow>();

  export function openShare(): void {
    shareFlow?.open();
  }

  export function showFocus(): void {
    focusSheetHost?.show();
  }

  export function openDelete(): void {
    deleteFlow?.open();
  }
</script>

<ShareFlow
  bind:this={shareFlow}
  {slideshow}
  {storage}
  {linkSession}
  {exportState}
  {onExport}
  onOpened={onShareOpened}
  {newVideoExport}
  {newHtmlExport}
  onClosed={onShareClosed}
/>
<FocusSheetHost
  bind:this={focusSheetHost}
  {focus}
  pictures={slideshow.pictures}
  search={focusSearch}
  passPaused={focusPaused}
  onServer={storage?.kind === "server"}
  {onEdit}
  {onLookAgain}
/>

<DeleteFlow
  bind:this={deleteFlow}
  title={slideshow.title}
  pictureCount={slideshow.pictures.length}
  onServer={storage?.kind === "server"}
  {onDelete}
  onKept={onClosed}
/>
