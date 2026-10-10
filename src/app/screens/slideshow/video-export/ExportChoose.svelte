<script lang="ts">
  import { onMount } from "svelte";
  import { FRAMES_PER_SECOND, type PresetId } from "../../../../video-export";
  import Icon from "../../../components/Icon.svelte";
  import Notice from "../../../components/Notice.svelte";
  import { getTranslator } from "../../../i18n/context";
  import type { ExportSheetState } from "../../../video-export/export-sheet-state";
  import PresetRadios from "./PresetRadios.svelte";

  /** The size, the format and the notes before the start. */
  let {
    view,
    estimate,
    fromImmich,
    onSelect,
    onStart,
    onCancel,
  }: {
    view: Extract<ExportSheetState, { readonly kind: "choose" }>;
    estimate: (preset: PresetId) => number;
    /** A server slideshow's pictures are downloaded from Immich: the size line says so. */
    fromImmich: boolean;
    onSelect: (preset: PresetId) => void;
    onStart: () => void;
    onCancel: () => void;
  } = $props();

  const { t, formatBytes } = getTranslator();
  let radios = $state<PresetRadios>();
  onMount(() => radios?.focus());

  const shortage = $derived(view.spaceShortage);
</script>

<PresetRadios
  bind:this={radios}
  available={view.available}
  preset={view.preset}
  {estimate}
  {fromImmich}
  {onSelect}
/>
<div class="spec mono">
  <span>{t("videoExport.container")}</span>
  <span>{t("videoExport.videoCodec")}</span>
  {#if view.audioCodec !== null}<span>{t(`videoExport.audio-${view.audioCodec}`)}</span>{/if}
  <span>{t("videoExport.frameRate", { fps: FRAMES_PER_SECOND })}</span>
</div>
{#if view.audioCodec === "opus"}
  <Notice tone="warn">
    <b>{t("videoExport.opusTitle")}</b>
    {t("videoExport.opusText")}
  </Notice>
{/if}
{#if shortage !== null}
  <Notice tone="warn">
    <b>{t("videoExport.spaceTitle")}</b>
    {t("videoExport.spaceText", {
      free: formatBytes(shortage.freeBytes),
      preset: t(`videoExport.preset-${view.preset}`),
      needed: formatBytes(shortage.neededBytes),
    })}
    {#if shortage.fitting !== null}
      {t("videoExport.spaceFits", { preset: t(`videoExport.preset-${shortage.fitting}`) })}
    {/if}
  </Notice>
{/if}
<p class="hint">{t("videoExport.hint")}</p>
<footer>
  <button class="btn ghost" type="button" onclick={onCancel}>{t("common.cancel")}</button>
  <button class="btn primary" type="button" disabled={view.starting} onclick={onStart}>
    <Icon name="film" />{t("videoExport.start")}
  </button>
</footer>

<style>
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
  b {
    font-weight: var(--gl-weight-semibold);
  }
</style>
