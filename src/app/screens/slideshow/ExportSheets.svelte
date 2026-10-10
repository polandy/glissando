<script lang="ts">
  import { flushSync } from "svelte";
  import type { HtmlExportSession } from "../../html-export/html-export-session";
  import type { ExportPreview } from "../../video-export/slideshow-video-export";
  import type { VideoExportSession } from "../../video-export/video-export-session";
  import type { SlideshowDetails } from "../view-models";
  import HtmlExportSheet from "./HtmlExportSheet.svelte";
  import VideoExportSheet from "./VideoExportSheet.svelte";

  /** The "Save as" sheets; closing one gives focus back to the button it was opened from. */
  let {
    slideshow,
    newVideoExport,
    newHtmlExport,
    onVideoClosed,
    onHtmlClosed,
  }: {
    slideshow: SlideshowDetails;
    newVideoExport: () => VideoExportSession<ExportPreview>;
    newHtmlExport: () => HtmlExportSession;
    onVideoClosed: () => void;
    onHtmlClosed: () => void;
  } = $props();

  let videoExport = $state.raw<VideoExportSession<ExportPreview> | null>(null);
  let htmlExport = $state.raw<HtmlExportSession | null>(null);

  export function openVideo(): void {
    videoExport = newVideoExport();
  }

  export function openWebPage(): void {
    htmlExport = newHtmlExport();
  }

  // The modal dialog must be gone first: until then the page behind it is inert.
  function closeVideo(): void {
    videoExport = null;
    flushSync();
    onVideoClosed();
  }

  function closeHtml(): void {
    htmlExport = null;
    flushSync();
    onHtmlClosed();
  }
</script>

{#if videoExport !== null}
  <VideoExportSheet session={videoExport} coverUrl={slideshow.coverUrl} onClose={closeVideo} />
{/if}

{#if htmlExport !== null}
  <HtmlExportSheet
    session={htmlExport}
    coverUrl={slideshow.coverUrl}
    thumbnailUrls={slideshow.pictures.map((picture) => picture.thumbnailUrl)}
    onClose={closeHtml}
  />
{/if}
