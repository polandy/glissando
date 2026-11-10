<script lang="ts">
  import type { OptionalImmichPermission } from "../../immich/immich-client";
  import type { ImmichAlbum, ImmichPerson, ImmichPhoto } from "../../immich/immich-client";
  import type { PhotoFeed } from "../../immich/photo-feed";
  import type { OpenedSource } from "../navigation/route";
  import type { Crumb } from "../components/crumbs";
  import Header from "../components/Header.svelte";
  import { getTranslator } from "../i18n/context";
  import AlbumsTab from "./AlbumsTab.svelte";
  import { albumSource, folderSource, personSource, type BrowseSource } from "./browse-source";
  import BrowserTabs from "./BrowserTabs.svelte";
  import { browserEndObserver, type EndObserver } from "./end-observer";
  import FoldersTab from "./FoldersTab.svelte";
  import type { ImmichBrowser } from "./immich-browser";
  import ImmichFooter from "./ImmichFooter.svelte";
  import { hiddenTools, shownTab, visibleTabs } from "./immich-tools";
  import { NOTHING_ALREADY_IN, selectionSummary, sourceSpans, type AlreadyIn } from "./immich-view";
  import OpenedGone from "./OpenedGone.svelte";
  import PeopleTab from "./PeopleTab.svelte";
  import PhotoFeedView from "./PhotoFeedView.svelte";
  import PhotosTab from "./PhotosTab.svelte";
  import SourceView from "./SourceView.svelte";

  /**
   * The Immich browser: All pictures, Albums, People and Folders, or one album or person; picks
   * join the pictures being taken in on Add.
   */
  let {
    browser,
    parentCrumbs,
    alreadyIn = NOTHING_ALREADY_IN,
    opened,
    missingPermissions = [],
    thumbnailUrl,
    faceUrl,
    onBack,
    onOpenAlbum,
    onOpenPerson,
    onAdd,
    onError,
    onReload,
    observeEnd = browserEndObserver,
  }: {
    browser: ImmichBrowser;
    /** The crumbs of the screen it was opened from. */
    parentCrumbs: readonly Crumb[];
    /** Photos already in the slideshow or already taken in: shown, never selected. */
    alreadyIn?: AlreadyIn;
    /** One album's or person's pictures; the tabs without it. */
    opened: OpenedSource | null;
    /** What the server's key lacks, from the status: those tools are hidden. */
    missingPermissions?: readonly OptionalImmichPermission[];
    thumbnailUrl: (photoId: string) => string;
    faceUrl: (personId: string) => string;
    /** A level up: album or person → its tab → pictures step. */
    onBack: () => void;
    onOpenAlbum: (album: ImmichAlbum) => void;
    onOpenPerson: (person: ImmichPerson) => void;
    onAdd: (photos: readonly ImmichPhoto[]) => void;
    onError: (error: unknown) => void;
    /** Reloads the app: the remedy for an expired sign-in at the owner's proxy. */
    onReload: () => void;
    observeEnd?: EndObserver;
  } = $props();

  const { t } = getTranslator();

  // The browser lives as long as the import session, longer than this route.
  // svelte-ignore state_referenced_locally
  let browserState = $state.raw(browser.state);
  // svelte-ignore state_referenced_locally
  let selected = $state.raw(browser.selection.photos());
  $effect(() => browser.subscribe((next) => (browserState = next)));
  $effect(() => browser.selection.subscribe((next) => (selected = next)));

  const selectedIds = $derived(new Set(selected.map(({ id }) => id)));
  const hidden = $derived(
    hiddenTools(missingPermissions, {
      months: browserState.months,
      people: browserState.people,
      folderPaths: browserState.folderPaths,
    }),
  );
  const tabs = $derived(visibleTabs(hidden));
  const tab = $derived(shownTab(browserState.tab, hidden));
  const album = $derived(
    opened?.kind === "album"
      ? (browserState.albums?.find(({ id }) => id === opened.id) ?? null)
      : null,
  );
  const person = $derived(
    opened?.kind === "person"
      ? (browserState.people.items?.find(({ id }) => id === opened.id) ?? null)
      : null,
  );
  const openedName = $derived(album?.name ?? person?.name ?? null);
  const summary = $derived(
    selectionSummary(selected.length, sourceSpans(browserState.membership, selectedIds)),
  );
  const crumbs = $derived([
    ...parentCrumbs,
    t("immich.name"),
    ...(openedName === null ? [] : [openedName]),
  ]);

  $effect(() => {
    if (opened?.kind === "album" || (opened === null && tab === "albums")) {
      browser.loadAlbums().catch(onError);
    }
    if (opened?.kind === "person" || (opened === null && tab === "people")) {
      browser.loadPeople().catch(onError);
    }
    if (opened === null && tab === "photos" && !hidden.has("months")) {
      browser.loadMonths().catch(onError);
    }
    if (opened === null && tab === "folders") browser.loadFolders().catch(onError);
  });

  function selectDay(photos: readonly ImmichPhoto[], select: boolean): void {
    if (select) browser.selection.selectAll(photos);
    else browser.selection.deselectAll(photos);
  }

  function toggleSource(source: BrowseSource): void {
    browser.toggleSource(source, alreadyIn).catch(onError);
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
    {alreadyIn}
    {thumbnailUrl}
    {observeEnd}
    onToggle={(photo, shown) =>
      shown === null ? browser.selection.toggle(photo) : browser.selection.extendTo(photo, shown)}
    onSelectDay={selectDay}
    {onError}
    {onReload}
  />
{/snippet}

{#snippet sourcePane(
  source: BrowseSource,
  declaredCount: number | null,
  emptyTitle: string,
  emptyText: string,
)}
  {@const key = `${source.kind}:${source.id}`}
  <SourceView
    feed={browser.sourceFeed(source)}
    {emptyTitle}
    {emptyText}
    {declaredCount}
    membership={browserState.membership.get(key)}
    busy={browserState.busySources.has(key)}
    failure={browserState.sourceFailures.get(key) ?? null}
    {selectedIds}
    {alreadyIn}
    onToggleAll={() => toggleSource(source)}
    {feedView}
  />
{/snippet}

<div class="screen">
  <Header {crumbs} {onBack} />
  <main class="content browse">
    {#if opened?.kind === "album"}
      {#if album !== null}
        <h1 class="title">{album.name}</h1>
        {@render sourcePane(
          albumSource(album.id),
          album.photoCount,
          t("immich.emptyAlbum"),
          t("immich.emptyAlbumText"),
        )}
      {:else}
        <OpenedGone
          loadingTitle={t("immich.loadingAlbum")}
          goneTitle={t("immich.albumGone")}
          backLabel={t("immich.backToAlbums")}
          failure={browserState.albumsFailure}
          loaded={browserState.albums !== null}
          onRetry={() => browser.retryAlbums().catch(onError)}
          {onBack}
          {onReload}
        />
      {/if}
    {:else if opened?.kind === "person"}
      {#if person !== null}
        <h1 class="title">{person.name}</h1>
        {@render sourcePane(
          personSource(person.id),
          null,
          t("immich.emptySource"),
          t("immich.emptySourceText"),
        )}
      {:else}
        <OpenedGone
          loadingTitle={t("immich.loadingPerson")}
          goneTitle={t("immich.personGone")}
          backLabel={t("immich.backToPeople")}
          failure={browserState.people.failure}
          loaded={browserState.people.items !== null}
          onRetry={() => browser.retryPeople().catch(onError)}
          {onBack}
          {onReload}
        />
      {/if}
    {:else}
      <div class="browse-head">
        <BrowserTabs {tabs} {tab} onPick={(picked) => browser.showTab(picked)} />
      </div>
      {#if tab === "photos"}
        <PhotosTab
          feed={browser.library}
          months={hidden.has("months") ? null : browserState.months.items}
          monthsFailure={hidden.has("months") ? null : browserState.months.failure}
          month={browserState.month}
          favourites={browserState.favourites}
          onMonth={(month) => browser.jumpToMonth(month)}
          onFavourites={(on) => browser.setFavourites(on)}
          onRetryMonths={() => browser.retryMonths().catch(onError)}
          {feedView}
        />
      {:else if tab === "people"}
        <PeopleTab
          people={browserState.people}
          {faceUrl}
          onOpen={onOpenPerson}
          onRetry={() => browser.retryPeople().catch(onError)}
          {onReload}
        />
      {:else if tab === "folders"}
        <FoldersTab
          folders={browserState.folderPaths}
          folderPath={browserState.folderPath}
          onOpenFolder={(path) => browser.openFolder(path)}
          onRetry={() => browser.retryFolders().catch(onError)}
          {onReload}
        >
          {#snippet pictures(path)}
            {@render sourcePane(
              folderSource(path),
              null,
              t("immich.emptySource"),
              t("immich.emptySourceText"),
            )}
          {/snippet}
        </FoldersTab>
      {:else}
        <AlbumsTab
          albums={browserState.albums}
          failure={browserState.albumsFailure}
          membership={browserState.membership}
          busySources={browserState.busySources}
          sourceFailures={browserState.sourceFailures}
          {selectedIds}
          {alreadyIn}
          {thumbnailUrl}
          onOpen={onOpenAlbum}
          onToggle={(target) => toggleSource(albumSource(target.id))}
          onRetry={() => browser.retryAlbums().catch(onError)}
          {onReload}
        />
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
  @container (max-width: 720px) {
    .browse {
      padding: 16px;
    }
  }
</style>
