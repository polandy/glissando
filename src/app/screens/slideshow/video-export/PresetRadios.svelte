<script lang="ts">
  import { VIDEO_PRESETS, type PresetId } from "../../../../video-export";
  import { getTranslator } from "../../../i18n/context";
  import { PRESET_NAME_KEY } from "../../../video-export/size-scale";
  import SizeRadios from "../export-sheet/SizeRadios.svelte";

  /** The three video sizes; one this device cannot encode is greyed out. */
  let {
    available,
    preset,
    estimate,
    onSelect,
  }: {
    available: readonly PresetId[];
    preset: PresetId;
    estimate: (preset: PresetId) => number;
    onSelect: (preset: PresetId) => void;
  } = $props();

  const { t, formatBytes } = getTranslator();
  let radios = $state<SizeRadios<PresetId>>();

  /** Focuses the chosen size, as the sheet opens. */
  export function focus(): void {
    radios?.focus();
  }

  const options = $derived(
    VIDEO_PRESETS.map(({ id, size }) => {
      const usable = available.includes(id);
      return {
        id,
        name: t(PRESET_NAME_KEY[id]),
        size: usable ? t("videoExport.about", { size: formatBytes(estimate(id)) }) : "",
        use: t("videoExport.sizeLine", {
          resolution: t("videoExport.resolution", {
            width: String(size.width),
            height: String(size.height),
          }),
          use: usable ? t(`videoExport.use-${id}`) : t("videoExport.cannotEncode"),
        }),
        usable,
      };
    }),
  );
</script>

<SizeRadios
  bind:this={radios}
  label={t("videoExport.sizes")}
  {options}
  selected={preset}
  {onSelect}
/>
