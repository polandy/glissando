<script lang="ts">
  import type { PicturesFocus } from "../../focus/pictures-focus";
  import type { SlideshowSearch } from "../../../library/focus-pass";
  import type { HtmlExportSession } from "../../html-export/html-export-session";
  import type { ExportPreview } from "../../video-export/slideshow-video-export";
  import type { VideoExportSession } from "../../video-export/video-export-session";
  import type { SlideshowDetails, SlideshowStorage } from "../view-models";
  import ExportSheets from "./ExportSheets.svelte";
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
    newVideoExport,
    newHtmlExport,
    onDelete,
    onClosed,
  }: {
    slideshow: SlideshowDetails;
    storage: SlideshowStorage | null;
    focus: PicturesFocus;
    focusSearch: SlideshowSearch | undefined;
    focusPaused: boolean;
    onEdit: (pictureId: string) => void;
    onLookAgain: (pictureIds: readonly string[]) => void;
    newVideoExport: () => VideoExportSession<ExportPreview>;
    newHtmlExport: () => HtmlExportSession;
    onDelete: () => void;
    /** An overlay closed without acting further; focus goes back to the button it opened from. */
    onClosed: () => void;
  } = $props();

  let exportSheets = $state<ExportSheets>();
  let focusSheetHost = $state<FocusSheetHost>();
  let deleteFlow = $state<DeleteFlow>();

  export function openVideoExport(): void {
    exportSheets?.openVideo();
  }

  export function openWebPageExport(): void {
    exportSheets?.openWebPage();
  }

  export function showFocus(): void {
    focusSheetHost?.show();
  }

  export function openDelete(): void {
    deleteFlow?.open();
  }
</script>

<ExportSheets
  bind:this={exportSheets}
  {slideshow}
  {newVideoExport}
  {newHtmlExport}
  onVideoClosed={onClosed}
  onHtmlClosed={onClosed}
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
