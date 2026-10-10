<script lang="ts">
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import type { PictureImportState } from "../../import/picture-import";
  import { picturesPhase } from "./import-view";

  /** Step 1's count and meter: downscaling with Cancel, or what is in with "add more". */
  let {
    state,
    range,
    onCancel,
    onAddMore,
    onMoreFromImmich,
  }: {
    state: PictureImportState;
    /** The capture dates of the stored pictures; null while none is stored. */
    range: { readonly from: string; readonly to: string } | null;
    onCancel: () => void;
    /** Null where no pictures come from the device, as for a server slideshow. */
    onAddMore: (() => void) | null;
    /** Shown only while Immich can be opened. */
    onMoreFromImmich: (() => void) | null;
  } = $props();

  const { t, formatDate } = getTranslator();
  const importing = $derived(picturesPhase(state) === "importing");
</script>

<div class="progress">
  <div class="progress-row">
    {#if importing}
      <span>
        <span class="mono">
          {t("import.progressCount", { done: state.done, count: state.total })}
        </span>
        {t("import.progressLabel", { count: state.total })}
      </span>
      <button class="btn ghost" type="button" onclick={onCancel}>
        {t("common.cancel")}
      </button>
    {:else if range !== null}
      <span>
        <b>{t("units.pictures", { count: state.pictures.length })}</b>
        <span class="muted">
          · {t("import.dateRange", { from: formatDate(range.from), to: formatDate(range.to) })}
        </span>
      </span>
      <span class="more">
        {#if onMoreFromImmich !== null}
          <button class="btn ghost" type="button" onclick={onMoreFromImmich}>
            <Icon name="plus" />{t("immich.more")}
          </button>
        {/if}
        {#if onAddMore !== null}
          <button class="btn ghost" type="button" onclick={onAddMore}>
            <Icon name="plus" />{t("import.addMore")}
          </button>
        {/if}
      </span>
    {/if}
  </div>
  <div class="meter">
    <i style:width="{state.total > 0 ? (state.done / state.total) * 100 : 0}%"></i>
  </div>
</div>

<style>
  .progress {
    display: grid;
    gap: 10px;
    padding: 14px 16px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
  }
  .progress-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  .more {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 4px;
  }
  .meter {
    height: 6px;
    overflow: hidden;
    border-radius: 3px;
    background: var(--gl-hover);
  }
  .meter i {
    display: block;
    height: 100%;
    border-radius: 3px;
    background: var(--gl-mint);
    transition: width 0.3s;
  }
  @media (prefers-reduced-motion: reduce) {
    .meter i {
      transition: none;
    }
  }
</style>
