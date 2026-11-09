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
  import type { SlideshowSheets } from "./slideshow-sheets.svelte";
  import ShareFlow from "./share/ShareFlow.svelte";
  import FocusSheet from "./FocusSheet.svelte";
  import DeleteDialog from "./DeleteDialog.svelte";

  /**
   * The slideshow screen's modal overlays that are not part of its editing sheets: share, focus
   * and delete, the one `sheets` names. Grouped apart from `SlideshowEditSheets` only to keep
   * `SlideshowScreen` under its line limit.
   */
  let {
    sheets,
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
  }: {
    sheets: SlideshowSheets;
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
  } = $props();

  const open = $derived(sheets.current?.kind);
  const onServer = $derived(storage?.kind === "server");
  const close = () => sheets.close();
</script>

{#if open === "share"}
  <ShareFlow
    {slideshow}
    {storage}
    {linkSession}
    {exportState}
    {onExport}
    onOpened={onShareOpened}
    {newVideoExport}
    {newHtmlExport}
    onClose={close}
  />
{:else if open === "focus"}
  <FocusSheet
    {focus}
    pictures={slideshow.pictures}
    search={focusSearch}
    passPaused={focusPaused}
    {onServer}
    onEdit={(pictureId) => {
      sheets.handOff();
      onEdit(pictureId);
    }}
    {onLookAgain}
    onClose={close}
  />
{:else if open === "delete"}
  <DeleteDialog
    title={slideshow.title}
    pictureCount={slideshow.pictures.length}
    {onServer}
    onKeep={close}
    onDelete={() => {
      sheets.handOff();
      onDelete();
    }}
  />
{/if}
