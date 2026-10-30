<script lang="ts" module>
  /** The link row's state: absent without a server library, or the slideshow's link. */
  export type ShareChooserLink =
    | { readonly kind: "absent" }
    | { readonly kind: "device" }
    | {
        readonly kind: "server";
        /** The link as shared; null while the slideshow is not shared (or not yet known). */
        readonly url: string | null;
      };
</script>

<script lang="ts">
  import { getTranslator } from "../../../i18n/context";
  import type { ExportMenuState } from "../../../glissando-file/export-menu";
  import { shareSummary } from "../../../share-link/share-summary";
  import type { ShareSubject } from "../../../share-link/ShareSheet.svelte";
  import ExportDialog from "../export-sheet/ExportDialog.svelte";
  import ShareOption from "./ShareOption.svelte";

  /**
   * "Share" (share_link/IN_THE_APP.md): one place for the link and for the copies — video, web
   * page and Glissando file. Choosing a row opens that row's sheet in place of this one.
   */
  let {
    subject,
    link,
    exportState,
    onServer,
    onChooseLink,
    onChooseVideo,
    onChooseWebPage,
    onChooseFile,
    onClose,
  }: {
    subject: ShareSubject;
    link: ShareChooserLink;
    exportState: ExportMenuState;
    /** The slideshow lives on the server: its file is pictures pulled from Immich. */
    onServer: boolean;
    onChooseLink: () => void;
    onChooseVideo: () => void;
    onChooseWebPage: () => void;
    onChooseFile: () => void;
    onClose: () => void;
  } = $props();

  const PERCENT = 100;
  /** The row shows the link without its scheme: the host and the token tell links apart. */
  const SCHEME = /^https?:\/\//;
  const translator = getTranslator();
  const { t, formatBytes } = translator;

  const fileText = $derived.by(() => {
    if (exportState.kind === "this") {
      return t("glissandoFile.exportRunning", {
        percent: Math.round(exportState.fraction * PERCENT),
      });
    }
    if (exportState.kind === "other") return t("glissandoFile.exportAfterRunning");
    if (onServer) return t("server.exportHint");
    return exportState.sizeBytes === null
      ? t("share.fileTextUnknown")
      : t("share.fileText", { size: formatBytes(exportState.sizeBytes) });
  });
</script>

<ExportDialog
  labelId="share-chooser-title"
  title={t("share.sheetTitle")}
  subtitle={shareSummary(translator, subject)}
  closeLabel={t("common.close")}
  closeOnScrim
  {onClose}
>
  {#if link.kind !== "absent"}
    <section class="group" aria-labelledby="share-group-link">
      <h3 class="eyebrow" id="share-group-link">{t("share.groupLink")}</h3>
      {#if link.kind === "device"}
        <ShareOption icon="link" title={t("share.rowTitle")} text={t("share.deviceHint")} />
      {:else if link.url === null}
        <ShareOption
          icon="link"
          title={t("share.rowTitle")}
          text={t("share.rowText")}
          onChoose={onChooseLink}
        />
      {:else}
        <ShareOption
          icon="link"
          title={t("share.rowSharedTitle")}
          text={link.url.replace(SCHEME, "")}
          onChoose={onChooseLink}
        >
          {#snippet badge()}
            <span class="on-pill"><i></i>{t("share.on")}</span>
          {/snippet}
        </ShareOption>
      {/if}
    </section>
  {/if}
  <section class="group" aria-labelledby="share-group-copy">
    <h3 class="eyebrow" id="share-group-copy">{t("share.groupCopy")}</h3>
    <ShareOption
      icon="film"
      title={t("share.videoTitle")}
      text={t("share.videoText")}
      onChoose={onChooseVideo}
    />
    <ShareOption
      icon="page"
      title={t("share.pageTitle")}
      text={t("share.pageText")}
      onChoose={onChooseWebPage}
    />
    <ShareOption
      icon="files"
      title={t("share.fileTitle")}
      text={fileText}
      onChoose={onChooseFile}
      waiting={exportState.kind === "other"}
    />
  </section>
</ExportDialog>

<style>
  .group {
    display: grid;
    gap: 8px;
  }
  .eyebrow {
    margin: 0;
  }
  .on-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 8px;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-mint-tint);
    color: var(--gl-ink);
    font-size: var(--gl-size-small);
    font-weight: var(--gl-weight-semibold);
  }
  .on-pill i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--gl-mint);
  }
</style>
