<script lang="ts">
  import type { Snippet } from "svelte";
  import type { ImmichAlbum } from "../../immich/immich-client";
  import type { PhotoFeed } from "../../immich/photo-feed";
  import { getTranslator } from "../i18n/context";
  import BrowseState from "./BrowseState.svelte";
  import { albumPick, type AlbumMembership } from "./immich-view";

  /** One album: its name, Select all n / Select none, then its photos by day. */
  let {
    album,
    feed,
    membership,
    busy,
    selectedIds,
    onToggleAll,
    feedView,
  }: {
    album: ImmichAlbum;
    feed: PhotoFeed;
    membership: AlbumMembership | undefined;
    busy: boolean;
    selectedIds: ReadonlySet<string>;
    onToggleAll: () => void;
    feedView: Snippet<[PhotoFeed]>;
  } = $props();

  const { t } = getTranslator();
  const pick = $derived(albumPick(membership, selectedIds));
  /** Known once every page is read; until then the album's count still includes its videos. */
  const photoCount = $derived(membership?.complete ? membership.photoIds.size : null);
  const videosHidden = $derived(photoCount === null ? 0 : album.photoCount - photoCount);
  const empty = $derived(album.photoCount === 0 || photoCount === 0);
</script>

<h1 class="title">{album.name}</h1>
{#if empty}
  <BrowseState icon="image" title={t("immich.emptyAlbum")} text={t("immich.emptyAlbumText")} />
{:else}
  <div class="selbar">
    <span class="count">
      <span class="mono">{t("immich.photos", { count: photoCount ?? album.photoCount })}</span>
      {#if videosHidden > 0}· {t("immich.videosHidden", { count: videosHidden })}{/if}
    </span>
    <button class="btn small" type="button" disabled={busy} onclick={onToggleAll}>
      {#if pick.all}
        {t("immich.selectNone")}
      {:else if photoCount !== null}
        {t("immich.selectAll", { count: photoCount })}
      {:else}
        {t("immich.selectAllUncounted")}
      {/if}
    </button>
  </div>
  {@render feedView(feed)}
{/if}

<style>
  .selbar {
    position: sticky;
    z-index: 2;
    top: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: -8px;
    padding: 8px 0;
    border-bottom: 1px solid var(--gl-line);
    background: var(--gl-ground);
  }
  .count {
    flex: 1;
    color: var(--gl-muted);
    font-size: var(--gl-size-label);
  }
</style>
