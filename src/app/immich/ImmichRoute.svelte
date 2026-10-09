<script lang="ts">
  import type { ImmichAlbum, ImmichPhoto } from "../../immich/immich-client";
  import type { PhotoFeed } from "../../immich/photo-feed";
  import Header from "../components/Header.svelte";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import AlbumGrid from "./AlbumGrid.svelte";
  import AlbumView from "./AlbumView.svelte";
  import BrowseFailed from "./BrowseFailed.svelte";
  import BrowseState from "./BrowseState.svelte";
  import { browserEndObserver, type EndObserver } from "./end-observer";
  import type { BrowserTab, ImmichBrowser } from "./immich-browser";
  import ImmichFooter from "./ImmichFooter.svelte";
  import { albumsWithSelection, filterAlbums, selectionSummary } from "./immich-view";
  import PhotoFeedView from "./PhotoFeedView.svelte";

  /** The Immich browser: All photos and Albums, or one album; picks join the import on Add. */
  let {
    browser,
    albumId,
    thumbnailUrl,
    onBack,
    onOpenAlbum,
    onAdd,
    onError,
    onReload,
    observeEnd = browserEndObserver,
  }: {
    browser: ImmichBrowser;
    /** One album's photos; the tabs without it. */
    albumId: string | null;
    thumbnailUrl: (photoId: string) => string;
    /** A level up: album → albums → pictures step. */
    onBack: () => void;
    onOpenAlbum: (album: ImmichAlbum) => void;
    onAdd: (photos: readonly ImmichPhoto[]) => void;
    onError: (error: unknown) => void;
    /** Reloads the app: the remedy for an expired sign-in at the owner's proxy. */
    onReload: () => void;
    observeEnd?: EndObserver;
  } = $props();

  const TABS: readonly BrowserTab[] = ["photos", "albums"];
  const { t } = getTranslator();

  // The browser lives as long as the import session, longer than this route.
  // svelte-ignore state_referenced_locally
  let browserState = $state.raw(browser.state);
  // svelte-ignore state_referenced_locally
  let selected = $state.raw(browser.selection.photos());
  let filter = $state("");
  $effect(() => browser.subscribe((next) => (browserState = next)));
  $effect(() => browser.selection.subscribe((next) => (selected = next)));

  const selectedIds = $derived(new Set(selected.map(({ id }) => id)));
  const album = $derived(browserState.albums?.find(({ id }) => id === albumId) ?? null);
  const summary = $derived(
    selectionSummary(selected.length, albumsWithSelection(browserState.membership, selectedIds)),
  );
  const crumbs = $derived([
    t("import.crumb"),
    t("import.crumbPictures"),
    t("immich.name"),
    ...(album === null ? [] : [album.name]),
  ]);

  $effect(() => {
    if (albumId !== null || browserState.tab === "albums") browser.loadAlbums().catch(onError);
  });

  function selectDay(photos: readonly ImmichPhoto[], select: boolean): void {
    if (select) browser.selection.selectAll(photos);
    else browser.selection.deselectAll(photos);
  }

  function toggleAlbum(target: ImmichAlbum): void {
    browser.toggleAlbum(target.id).catch(onError);
  }

  function retryAlbums(): void {
    browser.retryAlbums().catch(onError);
  }

  function add(): void {
    const photos = browser.selection.photos();
    browser.selection.clear();
    onAdd(photos);
  }
</script>

{#snippet feedView(feed: PhotoFeed)}
  <PhotoFeedView
    {feed}
    {selectedIds}
    {thumbnailUrl}
    {observeEnd}
    onToggle={(photo, shown) =>
      shown === null ? browser.selection.toggle(photo) : browser.selection.extendTo(photo, shown)}
    onSelectDay={selectDay}
    {onError}
    {onReload}
  />
{/snippet}

<div class="screen">
  <Header {crumbs} {onBack} />
  <main class="content browse">
    {#if albumId !== null}
      {#if album !== null}
        <AlbumView
          {album}
          feed={browser.albumFeed(album.id)}
          membership={browserState.membership.get(album.id)}
          busy={browserState.busyAlbumIds.has(album.id)}
          failure={browserState.albumFailures.get(album.id) ?? null}
          {selectedIds}
          onToggleAll={() => toggleAlbum(album)}
          {feedView}
        />
      {:else if browserState.albumsFailure !== null}
        <BrowseFailed failure={browserState.albumsFailure} onRetry={retryAlbums} {onReload} />
      {:else if browserState.albums === null}
        <BrowseState icon="image" title={t("immich.loadingAlbum")} />
      {:else}
        <BrowseState icon="image" title={t("immich.albumGone")}>
          {#snippet action()}
            <button class="btn" type="button" onclick={onBack}>{t("immich.backToAlbums")}</button>
          {/snippet}
        </BrowseState>
      {/if}
    {:else}
      <div class="browse-head">
        <div class="tabs" role="tablist" aria-label={t("immich.views")}>
          {#each TABS as tab (tab)}
            <button
              type="button"
              role="tab"
              aria-selected={browserState.tab === tab}
              onclick={() => browser.showTab(tab)}
            >
              {tab === "photos" ? t("immich.tabPhotos") : t("immich.tabAlbums")}
            </button>
          {/each}
        </div>
        {#if browserState.tab === "photos"}
          <span class="hint">{t("immich.newestFirst")}</span>
        {:else}
          <label class="filter">
            <Icon name="search" />
            <input
              class="field"
              type="search"
              autocomplete="off"
              placeholder={t("immich.filter")}
              aria-label={t("immich.filter")}
              bind:value={filter}
            />
          </label>
        {/if}
      </div>
      {#if browserState.tab === "photos"}
        {@render feedView(browser.library)}
      {:else if browserState.albumsFailure !== null}
        <BrowseFailed failure={browserState.albumsFailure} onRetry={retryAlbums} {onReload} />
      {:else}
        {@const shown =
          browserState.albums === null ? null : filterAlbums(browserState.albums, filter)}
        {#if shown !== null && shown.length === 0}
          <BrowseState
            icon="search"
            title={t("immich.noAlbumMatches")}
            text={t("immich.noAlbumMatchesText", { filter: filter.trim() })}
          />
        {:else}
          <AlbumGrid
            albums={shown}
            membership={browserState.membership}
            busyAlbumIds={browserState.busyAlbumIds}
            albumFailures={browserState.albumFailures}
            {selectedIds}
            {thumbnailUrl}
            onOpen={onOpenAlbum}
            onToggle={toggleAlbum}
          />
        {/if}
      {/if}
    {/if}
  </main>
  <ImmichFooter {summary} onClear={() => browser.selection.clear()} onAdd={add} />
</div>

<style>
  .browse {
    gap: 16px;
    padding-top: 20px;
  }
  .browse-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .hint {
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
  .tabs {
    display: inline-flex;
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
  .filter {
    --gl-icon-size: var(--gl-size-icon-small);
    position: relative;
    width: 260px;
    max-width: 100%;
    color: var(--gl-faint);
  }
  .filter :global(.icon) {
    position: absolute;
    top: 11px;
    left: 11px;
  }
  .field {
    width: 100%;
    height: 38px;
    padding: 0 11px 0 34px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
    outline: none;
    background: var(--gl-raised);
    color: var(--gl-ink);
    font: inherit;
    font-size: var(--gl-size-body);
  }
  .field:focus {
    border-color: var(--gl-accent);
  }
  @container (max-width: 720px) {
    .browse {
      padding: 16px;
    }
    .filter {
      width: 100%;
    }
  }
</style>
