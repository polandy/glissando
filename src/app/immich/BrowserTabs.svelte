<script lang="ts">
  import { getTranslator } from "../i18n/context";
  import type { BrowserTab } from "./immich-browser";

  /** The browser's views as a segmented tab bar. */
  let {
    tabs,
    tab,
    onPick,
  }: { tabs: readonly BrowserTab[]; tab: BrowserTab; onPick: (tab: BrowserTab) => void } = $props();

  const MESSAGES = {
    photos: "immich.tabPhotos",
    albums: "immich.tabAlbums",
    people: "immich.tabPeople",
    folders: "immich.tabFolders",
  } as const satisfies Record<BrowserTab, string>;
  const { t } = getTranslator();
</script>

<div class="tabs" role="tablist" aria-label={t("immich.views")}>
  {#each tabs as each (each)}
    <button type="button" role="tab" aria-selected={tab === each} onclick={() => onPick(each)}>
      {t(MESSAGES[each])}
    </button>
  {/each}
</div>

<style>
  .tabs {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 2px;
    padding: 3px;
    border-radius: var(--gl-radius);
    background: var(--gl-hover);
  }
  .tabs button {
    padding: 7px 14px;
    border: 0;
    border-radius: var(--gl-radius-small);
    background: transparent;
    color: var(--gl-muted);
    font: inherit;
    font-weight: var(--gl-weight-semibold);
    cursor: pointer;
  }
  .tabs button[aria-selected="true"] {
    background: var(--gl-surface);
    color: var(--gl-ink);
    box-shadow: var(--gl-shadow);
  }
</style>
