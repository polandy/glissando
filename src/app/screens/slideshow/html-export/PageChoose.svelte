<script lang="ts">
  import { onMount } from "svelte";
  import { PAGE_SIZES, type PageSizeId } from "../../../../html-export/plan";
  import Icon from "../../../components/Icon.svelte";
  import Notice from "../../../components/Notice.svelte";
  import { getTranslator } from "../../../i18n/context";
  import type { HtmlExportState } from "../../../html-export/html-export-state";
  import { sizesBarelyDiffer } from "../../../html-export/size-note";
  import { PAGE_SIZE_NAME_KEY } from "../../../html-export/size-scale";
  import SizeRadios from "../export-sheet/SizeRadios.svelte";

  /** The size with its estimate, the comparison with the video, and the notes before the start. */
  let {
    view,
    videoBytes,
    fromImmich,
    clipCount,
    onSelect,
    onStart,
    onCancel,
  }: {
    view: Extract<HtmlExportState, { readonly kind: "choose" }>;
    /** The 1080p video's rough size, the comparison's full bar. */
    videoBytes: number;
    /** A server slideshow's pictures are downloaded from Immich: the size line says so. */
    fromImmich: boolean;
    /** The video clips the page holds whole; its size is named before the start. */
    clipCount: number;
    onSelect: (sizeId: PageSizeId) => void;
    onStart: () => void;
    onCancel: () => void;
  } = $props();

  const { t, formatBytes } = getTranslator();
  const PERCENT = 100;
  /** The page's bar never shrinks to nothing, so it reads as a bar beside the video's. */
  const MIN_BAR_PERCENT = 2;
  const TOO_BIG_TO_MAIL: PageSizeId = "4k";

  let radios = $state<SizeRadios<PageSizeId>>();
  onMount(() => radios?.focus());

  const about = (bytes: number) => t("htmlExport.about", { size: formatBytes(bytes) });
  const options = $derived(
    PAGE_SIZES.map(({ id, bound }) => ({
      id,
      name: t(PAGE_SIZE_NAME_KEY[id]),
      size: fromImmich
        ? t("server.exportFromImmich")
        : view.estimates === null
          ? ""
          : about(view.estimates[id]),
      use: t("htmlExport.sizeLine", {
        pixels: String(bound.longEdge),
        use: t(`htmlExport.use-${id}`),
      }),
      usable: true,
    })),
  );
  // Clips go in whole at every size, so the estimates only differ by the pictures' share.
  const showClipsNote = $derived(
    clipCount > 0 && view.estimates !== null && sizesBarelyDiffer(Object.values(view.estimates)),
  );
  const pageBytes = $derived(view.estimates?.[view.sizeId] ?? null);
  const pagePercent = $derived(
    pageBytes === null
      ? 0
      : Math.min(PERCENT, Math.max(MIN_BAR_PERCENT, (pageBytes / videoBytes) * PERCENT)),
  );
</script>

<SizeRadios
  bind:this={radios}
  label={t("htmlExport.sizes")}
  {options}
  selected={view.sizeId}
  {onSelect}
/>
<div class="compare" role="group" aria-label={t("htmlExport.compare")}>
  <span>{t("htmlExport.compareWebPage")}</span>
  <span class="bar"><i style:width="{pagePercent}%"></i></span>
  <span class="value">{pageBytes === null ? "" : formatBytes(pageBytes)}</span>
  <span>{t("htmlExport.compareVideo")}</span>
  <span class="bar"><i class="video"></i></span>
  <span class="value">{formatBytes(videoBytes)}</span>
</div>
{#if view.sizeId === TOO_BIG_TO_MAIL}
  <Notice tone="warn">
    <b>{t("htmlExport.bigTitle")}</b>
    {t("htmlExport.bigText")}
  </Notice>
{/if}
{#if showClipsNote}
  <p class="hint note"><Icon name="info" />{t("htmlExport.clipsNote", { count: clipCount })}</p>
{/if}
<footer>
  <p class="hint footnote">{t("htmlExport.hint")}</p>
  <button class="btn ghost" type="button" onclick={onCancel}>{t("common.cancel")}</button>
  <button class="btn primary" type="button" disabled={view.starting} onclick={onStart}>
    <Icon name="page" />{t("htmlExport.start")}
  </button>
</footer>

<style>
  .compare {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 6px 10px;
    font-size: var(--gl-size-meta);
  }
  .bar {
    height: 6px;
    overflow: hidden;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-hover);
  }
  .bar i {
    display: block;
    height: 100%;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-mint);
  }
  .bar i.video {
    width: 100%;
    background: var(--gl-faint);
  }
  .value {
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
    text-align: right;
  }
  .note {
    display: flex;
    align-items: flex-start;
    gap: 6px;
  }
  .note :global(.icon) {
    margin-top: 2px;
  }
  .footnote {
    flex: 1 1 0;
    align-self: center;
    min-width: 0;
  }
  /* The same breakpoint as the dialog: on a phone the line sits above the buttons. */
  @media (max-width: 720px) {
    .footnote {
      flex-basis: 100%;
    }
  }
</style>
