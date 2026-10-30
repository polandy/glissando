<script lang="ts">
  import { flushSync, onMount } from "svelte";
  import type { ExportOutcome } from "../../../glissando-file/export-job";
  import type { ExportMenuState } from "../../../glissando-file/export-menu";
  import type { HtmlExportSession } from "../../../html-export/html-export-session";
  import type { ShareLinkSession, ShareLinkState } from "../../../share-link/share-link-session";
  import ShareSheet from "../../../share-link/ShareSheet.svelte";
  import type { ExportPreview } from "../../../video-export/slideshow-video-export";
  import type { VideoExportSession } from "../../../video-export/video-export-session";
  import type { SlideshowDetails, SlideshowStorage } from "../../view-models";
  import HtmlExportSheet from "../HtmlExportSheet.svelte";
  import VideoExportSheet from "../VideoExportSheet.svelte";
  import GlissandoFileSheet from "./GlissandoFileSheet.svelte";
  import ShareChooser, { type ShareChooserLink } from "./ShareChooser.svelte";

  /**
   * Everything the Share button opens: the chooser and, in place of it, the sheet of the row
   * chosen, each with Back to the chooser. Each sheet keeps its own logic; this only decides
   * which one is on screen. Closing any of them gives focus back through `onClosed`.
   */
  let {
    slideshow,
    storage,
    linkSession,
    exportState,
    onExport,
    onOpened,
    newVideoExport,
    newHtmlExport,
    onClosed,
  }: {
    slideshow: SlideshowDetails;
    /** Where the slideshow lives; null while the server library is off. */
    storage: SlideshowStorage | null;
    /** A server slideshow's link; null for a device slideshow. The screen owns and ends it. */
    linkSession: ShareLinkSession | null;
    exportState: ExportMenuState;
    onExport: () => Promise<ExportOutcome>;
    /** The chooser opened: the Glissando file's size is due. */
    onOpened: () => void;
    newVideoExport: () => VideoExportSession<ExportPreview>;
    newHtmlExport: () => HtmlExportSession;
    onClosed: () => void;
  } = $props();

  type Step = "chooser" | "link" | "video" | "page" | "file";

  let step = $state<Step | null>(null);
  let videoExport = $state.raw<VideoExportSession<ExportPreview> | null>(null);
  let htmlExport = $state.raw<HtmlExportSession | null>(null);
  // svelte-ignore state_referenced_locally
  let linkView = $state.raw<ShareLinkState | null>(linkSession?.state ?? null);

  const subject = $derived({
    title: slideshow.title,
    pictureCount: slideshow.pictures.length,
    durationSeconds: slideshow.durationSeconds,
    hasMusic: slideshow.songCount > 0,
  });

  const link = $derived.by((): ShareChooserLink => {
    if (storage === null) return { kind: "absent" };
    if (linkSession !== null) return { kind: "server", url: linkView?.link?.url ?? null };
    return storage.kind === "device" ? { kind: "device" } : { kind: "absent" };
  });

  onMount(() => {
    if (linkSession === null) return;
    return linkSession.subscribe((next) => {
      linkView = next;
      // The link sheet closing on its own, Back or a turned-off link, lands on the chooser.
      if (step === "link" && next.sheet === "closed") step = "chooser";
    });
  });

  export function open(): void {
    step = "chooser";
    onOpened();
    void linkSession?.load();
  }

  // The modal dialog must be gone first: until then the page behind it is inert.
  function closeAll(): void {
    step = null;
    videoExport = null;
    htmlExport = null;
    flushSync();
    onClosed();
  }

  function backToChooser(): void {
    step = "chooser";
    videoExport = null;
    htmlExport = null;
  }

  function chooseLink(): void {
    step = "link";
    linkSession?.open();
  }

  function chooseVideo(): void {
    videoExport = newVideoExport();
    step = "video";
  }

  function chooseWebPage(): void {
    htmlExport = newHtmlExport();
    step = "page";
  }
</script>

{#if step === "chooser"}
  <ShareChooser
    {subject}
    {link}
    {exportState}
    onServer={storage?.kind === "server"}
    onChooseLink={chooseLink}
    onChooseVideo={chooseVideo}
    onChooseWebPage={chooseWebPage}
    onChooseFile={() => (step = "file")}
    onClose={closeAll}
  />
{:else if step === "link" && linkSession !== null}
  <ShareSheet session={linkSession} {subject} onClose={closeAll} />
{:else if step === "video" && videoExport !== null}
  <VideoExportSheet
    session={videoExport}
    coverUrl={slideshow.coverUrl}
    onClose={closeAll}
    onBack={backToChooser}
  />
{:else if step === "page" && htmlExport !== null}
  <HtmlExportSheet
    session={htmlExport}
    coverUrl={slideshow.coverUrl}
    thumbnailUrls={slideshow.pictures.map((picture) => picture.thumbnailUrl)}
    onClose={closeAll}
    onBack={backToChooser}
  />
{:else if step === "file"}
  <GlissandoFileSheet
    {subject}
    {exportState}
    onSave={onExport}
    onBack={backToChooser}
    onClose={closeAll}
  />
{/if}
