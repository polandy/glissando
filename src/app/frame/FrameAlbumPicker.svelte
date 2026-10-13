<script lang="ts">
  import type { BrowseFailure } from "../../immich/browse-failure";
  import type { ImmichAlbum } from "../../immich/immich-client";
  import Notice from "../components/Notice.svelte";
  import { getTranslator } from "../i18n/context";

  /** The frame set-up screen's album grid, split out to keep that screen under the line limit. */
  let {
    albums,
    failure,
    selectedAlbumId,
    thumbnailUrl,
    onSelectAlbum,
    onRetry,
  }: {
    /** Null while loading. */
    albums: readonly ImmichAlbum[] | null;
    failure: BrowseFailure | null;
    selectedAlbumId: string | null;
    thumbnailUrl: (photoId: string) => string;
    onSelectAlbum: (albumId: string) => void;
    onRetry: () => void;
  } = $props();

  const { t, formatDayRange } = getTranslator();

  function albumMeta(album: ImmichAlbum): string {
    const photos = t("immich.photos", { count: album.photoCount });
    if (album.startDate === null || album.endDate === null) return photos;
    return t("immich.albumMeta", { photos, range: formatDayRange(album.startDate, album.endDate) });
  }
</script>

<p class="lab">{t("frame.albumLabel")}</p>
{#if failure !== null}
  <Notice tone="error">
    <b>{t("frame.unavailableTitle")}</b><br />{t("frame.unavailableText")}
    {#snippet actions()}
      <button class="btn ghost" type="button" onclick={onRetry}>{t("common.retry")}</button>
    {/snippet}
  </Notice>
{:else if albums === null}
  <p class="waiting" aria-live="polite">{t("frame.loadingAlbums")}</p>
{:else}
  <ul class="albums">
    {#each albums as album (album.id)}
      <li>
        <button
          class="album"
          type="button"
          aria-pressed={album.id === selectedAlbumId}
          onclick={() => onSelectAlbum(album.id)}
        >
          <span class="cover">
            {#if album.coverId !== null}
              <img src={thumbnailUrl(album.coverId)} alt="" loading="lazy" decoding="async" />
            {/if}
          </span>
          <b>{album.name}</b>
          <span class="meta">{albumMeta(album)}</span>
        </button>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .lab {
    margin: 0 0 8px;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
    font-weight: var(--gl-weight-semibold);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .waiting {
    margin: 0;
    color: var(--gl-muted);
  }
  .albums {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .album {
    display: grid;
    gap: 6px;
    width: 100%;
    padding: 6px;
    border: 2px solid transparent;
    border-radius: var(--gl-radius);
    background: var(--gl-surface);
    box-shadow: var(--gl-shadow);
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .album[aria-pressed="true"] {
    border-color: var(--gl-accent);
    background: color-mix(in srgb, var(--gl-accent) 14%, var(--gl-surface));
  }
  .cover {
    display: block;
    aspect-ratio: 4 / 3;
    border-radius: var(--gl-radius-small);
    background: var(--gl-hover);
    overflow: hidden;
  }
  .cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .meta {
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
</style>
