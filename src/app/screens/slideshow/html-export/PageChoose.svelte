<script lang="ts">
  import { onMount } from "svelte";
  import { PAGE_SIZES, type PageSizeId } from "../../../../html-export/plan";
  import Icon from "../../../components/Icon.svelte";
  import Notice from "../../../components/Notice.svelte";
  import { getTranslator } from "../../../i18n/context";
  import type { HtmlExportState } from "../../../html-export/html-export-state";
  import SizeRadios from "../export-sheet/SizeRadios.svelte";

  /** The size with its estimate, the comparison with the video, and the notes before the start. */
  let {
    view,
    videoBytes,
    onSelect,
    onStart,
    onCancel,
  }: {
    view: Extract<HtmlExportState, { readonly kind: "choose" }>;
    /** The 1080p video's rough size, the comparison's full bar. */
    videoBytes: number;
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
      name: t(`htmlExport.size-${id}`),
      detail: t("htmlExport.longEdge", { pixels: String(bound.longEdge) }),
      size: view.estimates === null ? "" : about(view.estimates[id]),
      use: t(`htmlExport.use-${id}`),
      usable: true,
    })),
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
  <span class="value mono">{pageBytes === null ? "" : formatBytes(pageBytes)}</span>
  <span>{t("htmlExport.compareVideo")}</span>
  <span class="bar"><i class="video"></i></span>
  <span class="value mono">{formatBytes(videoBytes)}</span>
</div>
{#if view.sizeId === TOO_BIG_TO_MAIL}
  <Notice tone="warn">
    <b>{t("htmlExport.bigTitle")}</b>
    {t("htmlExport.bigText")}
  </Notice>
{/if}
<div class="spec mono">
  <span>{t("htmlExport.chipFile")}</span>
  <span>{t("htmlExport.chipOffline")}</span>
  <span>{t("htmlExport.chipContent")}</span>
</div>
<p class="hint">{t("htmlExport.hint")}</p>
<footer>
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
  .spec {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .spec span {
    padding: 3px 8px;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-hover);
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
</style>
