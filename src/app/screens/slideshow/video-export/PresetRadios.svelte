<script lang="ts">
  import { VIDEO_PRESETS, type PresetId } from "../../../../video-export";
  import { radioIndexForKey } from "../../../components/radio-keys";
  import { getTranslator } from "../../../i18n/context";

  /** The three sizes; one this device cannot encode is greyed out and skipped by the arrows. */
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
  const radios: Partial<Record<PresetId, HTMLButtonElement>> = $state({});

  /** Focuses the chosen size, as the sheet opens. */
  export function focus(): void {
    radios[preset]?.focus();
  }

  // Selection follows focus, as in the WAI-ARIA radio group: one tab stop, arrows choose.
  function onkeydown(event: KeyboardEvent): void {
    const next = radioIndexForKey(event.key, available.indexOf(preset), available.length);
    const choice = next === null ? undefined : available[next];
    if (choice === undefined) {
      return;
    }
    event.preventDefault();
    onSelect(choice);
    radios[choice]?.focus();
  }
</script>

<div class="presets" role="radiogroup" aria-label={t("videoExport.sizes")}>
  {#each VIDEO_PRESETS as { id, size } (id)}
    {@const usable = available.includes(id)}
    <button
      bind:this={radios[id]}
      class="preset"
      type="button"
      role="radio"
      aria-checked={usable && id === preset}
      aria-disabled={!usable}
      tabindex={usable && id === preset ? 0 : -1}
      onclick={() => usable && onSelect(id)}
      {onkeydown}
    >
      <span class="dot"></span>
      <b>
        {t(`videoExport.preset-${id}`)}
        <span class="mono resolution">
          {t("videoExport.resolution", {
            width: String(size.width),
            height: String(size.height),
          })}
        </span>
      </b>
      <span class="size mono">
        {usable ? t("videoExport.about", { size: formatBytes(estimate(id)) }) : ""}
      </span>
      <small>{usable ? t(`videoExport.use-${id}`) : t("videoExport.cannotEncode")}</small>
    </button>
  {/each}
</div>

<style>
  .presets {
    display: grid;
    gap: 8px;
  }
  .preset {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 2px 12px;
    padding: 11px 14px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
    background: var(--gl-raised);
    color: var(--gl-ink);
    font: inherit;
    font-size: var(--gl-size-label);
    text-align: left;
    cursor: pointer;
  }
  .preset:hover {
    background: var(--gl-hover);
  }
  .preset[aria-checked="true"] {
    border-color: var(--gl-accent);
    box-shadow: inset 0 0 0 1px var(--gl-accent);
    background: color-mix(in srgb, var(--gl-accent) 10%, var(--gl-surface));
  }
  .preset[aria-disabled="true"] {
    background: transparent;
    color: var(--gl-faint);
    cursor: default;
  }
  .dot {
    grid-row: span 2;
    width: 18px;
    height: 18px;
    border: 2px solid var(--gl-faint);
    border-radius: 50%;
  }
  .preset[aria-checked="true"] .dot {
    border: 5px solid var(--gl-accent);
  }
  b {
    font-weight: var(--gl-weight-semibold);
    font-size: var(--gl-size-body);
  }
  .resolution {
    color: var(--gl-muted);
    font-weight: var(--gl-weight-regular);
    font-size: var(--gl-size-meta);
  }
  small {
    grid-column: 2;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
  .size {
    grid-row: span 2;
    color: var(--gl-muted);
    text-align: right;
  }
  .preset[aria-disabled="true"] :is(small, .size, .resolution) {
    color: var(--gl-faint);
  }
</style>
