<script lang="ts">
  import type { Snippet } from "svelte";
  import type { BrowseFailure } from "../../immich/browse-failure";
  import type { TimelineMonth } from "../../immich/immich-client";
  import type { PhotoFeed } from "../../immich/photo-feed";
  import Icon from "../components/Icon.svelte";
  import Sheet from "../components/Sheet.svelte";
  import { getTranslator } from "../i18n/context";
  import { browseFailureMessages } from "./immich-view";
  import MonthList from "./MonthList.svelte";

  /** All pictures: the month button and favourites chip, the months rail beside the grid. */
  let {
    feed,
    months,
    monthsFailure,
    month,
    favourites,
    onMonth,
    onFavourites,
    onRetryMonths,
    feedView,
  }: {
    feed: PhotoFeed;
    /** Null where the month jump is hidden or not yet read. */
    months: readonly TimelineMonth[] | null;
    monthsFailure: BrowseFailure | null;
    /** The month jumped to (`YYYY-MM`), or null for the newest. */
    month: string | null;
    favourites: boolean;
    onMonth: (month: string) => void;
    onFavourites: (on: boolean) => void;
    onRetryMonths: () => void;
    feedView: Snippet<[PhotoFeed]>;
  } = $props();

  const { t, formatMonth } = getTranslator();
  const SHEET_TITLE_ID = "month-sheet-title";
  let sheetOpen = $state(false);

  const shownMonth = $derived(month ?? months?.[0]?.month ?? null);

  function pick(picked: string): void {
    sheetOpen = false;
    onMonth(picked);
  }
</script>

<div class="toolbar">
  {#if months !== null && shownMonth !== null}
    <button
      class="chip mono"
      type="button"
      aria-haspopup="dialog"
      aria-label={t("immich.monthJump")}
      onclick={() => (sheetOpen = true)}
    >
      {formatMonth(shownMonth)}
      <Icon name="down" />
    </button>
  {:else if monthsFailure !== null}
    <button class="chip" type="button" onclick={onRetryMonths}>
      {t(browseFailureMessages(monthsFailure).line)} · {t("immich.tryAgain")}
    </button>
  {/if}
  <button
    class="chip"
    type="button"
    aria-pressed={favourites}
    onclick={() => onFavourites(!favourites)}
  >
    <Icon name="star" />
    {t("immich.favourites")}
  </button>
  <span class="hint">{t("immich.newestFirst")}</span>
</div>

<div class="body">
  <div class="feed">
    {#key feed}{@render feedView(feed)}{/key}
  </div>
  {#if months !== null}
    <nav class="rail" aria-label={t("immich.months")}>
      <MonthList {months} current={shownMonth} onPick={pick} />
    </nav>
  {/if}
</div>

{#if sheetOpen && months !== null}
  <Sheet labelId={SHEET_TITLE_ID} onClose={() => (sheetOpen = false)}>
    <h2 id={SHEET_TITLE_ID} class="sheet-title">{t("immich.monthJump")}</h2>
    <div class="sheet-months"><MonthList {months} current={shownMonth} onPick={pick} /></div>
  </Sheet>
{/if}

<style>
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .chip {
    --gl-icon-size: var(--gl-size-icon-small);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-pill);
    background: var(--gl-raised);
    color: var(--gl-ink);
    font: inherit;
    font-size: var(--gl-size-label);
    cursor: pointer;
  }
  .chip[aria-pressed="true"] {
    border-color: var(--gl-accent);
    background: var(--gl-accent);
    color: var(--gl-accent-ink);
  }
  .hint {
    margin-left: auto;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
  .body {
    display: flex;
    align-items: flex-start;
    gap: 16px;
  }
  .feed {
    display: grid;
    flex: 1;
    gap: 16px;
    min-width: 0;
  }
  .rail {
    position: sticky;
    top: 0;
    flex: none;
    width: 150px;
    max-height: calc(100dvh - 160px);
    padding: 4px 8px;
    overflow-y: auto;
    border-left: 1px solid var(--gl-line);
  }
  .sheet-title {
    margin: 0;
    font-size: var(--gl-size-body);
  }
  @container (max-width: 720px) {
    .rail {
      display: none;
    }
  }
</style>
