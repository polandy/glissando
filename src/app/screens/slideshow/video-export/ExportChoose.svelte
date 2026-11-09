<script lang="ts">
  import { onMount } from "svelte";
  import type { PresetId } from "../../../../video-export";
  import Icon from "../../../components/Icon.svelte";
  import Notice from "../../../components/Notice.svelte";
  import { getTranslator } from "../../../i18n/context";
  import type { ExportSheetState } from "../../../video-export/export-sheet-state";
  import { PRESET_NAME_KEY } from "../../../video-export/size-scale";
  import PresetRadios from "./PresetRadios.svelte";

  /** The size, the format and the notes before the start. */
  let {
    view,
    estimate,
    onSelect,
    onStart,
    onCancel,
  }: {
    view: Extract<ExportSheetState, { readonly kind: "choose" }>;
    estimate: (preset: PresetId) => number;
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
  {onSelect}
/>
{#if view.audioCodec === "opus"}
  <p class="hint note"><Icon name="info" />{t("videoExport.appleNote")}</p>
{/if}
{#if shortage !== null}
  <Notice tone="warn">
    <b>{t("videoExport.spaceTitle")}</b>
    {t("videoExport.spaceText", {
      free: formatBytes(shortage.freeBytes),
      preset: t(PRESET_NAME_KEY[view.preset]),
      needed: formatBytes(shortage.neededBytes),
    })}
    {#if shortage.fitting !== null}
      {t("videoExport.spaceFits", { preset: t(PRESET_NAME_KEY[shortage.fitting]) })}
    {/if}
  </Notice>
{/if}
<footer>
  <p class="hint footnote">{t("videoExport.hint")}</p>
  <button class="btn ghost" type="button" onclick={onCancel}>{t("common.cancel")}</button>
  <button class="btn primary" type="button" disabled={view.starting} onclick={onStart}>
    <Icon name="film" />{t("videoExport.start")}
  </button>
</footer>

<style>
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
  b {
    font-weight: var(--gl-weight-semibold);
  }
</style>
