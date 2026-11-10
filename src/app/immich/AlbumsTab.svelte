<script lang="ts">
  import type { BrowseFailure } from "../../immich/browse-failure";
  import type { ImmichAlbum } from "../../immich/immich-client";
  import { getTranslator } from "../i18n/context";
  import AlbumGrid from "./AlbumGrid.svelte";
  import BrowseFailed from "./BrowseFailed.svelte";
  import BrowseState from "./BrowseState.svelte";
  import FilterField from "./FilterField.svelte";
  import { filterByName, type AlreadyIn, type SourceMembership } from "./immich-view";

  /** Albums: a filter by name above the covers. */
  let {
    albums,
    failure,
    membership,
    busySources,
    sourceFailures,
    selectedIds,
    alreadyIn,
    thumbnailUrl,
    onOpen,
    onToggle,
    onRetry,
    onReload,
  }: {
    /** Null until they have arrived. */
    albums: readonly ImmichAlbum[] | null;
    failure: BrowseFailure | null;
    membership: ReadonlyMap<string, SourceMembership>;
    busySources: ReadonlySet<string>;
    sourceFailures: ReadonlyMap<string, BrowseFailure>;
    selectedIds: ReadonlySet<string>;
    alreadyIn: AlreadyIn;
    thumbnailUrl: (photoId: string) => string;
    onOpen: (album: ImmichAlbum) => void;
    onToggle: (album: ImmichAlbum) => void;
    onRetry: () => void;
    onReload: () => void;
  } = $props();

  const { t } = getTranslator();
  let filter = $state("");
  const shown = $derived(albums === null ? null : filterByName(albums, filter));
</script>

<FilterField bind:value={filter} label={t("immich.filter")} />
{#if failure !== null}
  <BrowseFailed {failure} {onRetry} {onReload} />
{:else if shown !== null && shown.length === 0}
  <BrowseState
    icon="search"
    title={t("immich.noAlbumMatches")}
    text={t("immich.noAlbumMatchesText", { filter: filter.trim() })}
  />
{:else}
  <AlbumGrid
    albums={shown}
    {membership}
    {busySources}
    {sourceFailures}
    {selectedIds}
    {alreadyIn}
    {thumbnailUrl}
    {onOpen}
    {onToggle}
  />
{/if}
