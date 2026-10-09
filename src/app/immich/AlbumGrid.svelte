<script lang="ts">
  import type { BrowseFailure } from "../../immich/browse-failure";
  import type { ImmichAlbum } from "../../immich/immich-client";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import { albumPick, browseFailureMessages, type AlbumMembership } from "./immich-view";

  /** Album covers: a tap opens the album, the circle on the cover picks all of its photos. */
  let {
    albums,
    membership,
    busyAlbumIds,
    albumFailures,
    selectedIds,
    thumbnailUrl,
    onOpen,
    onToggle,
  }: {
    /** Null while loading: shimmering cards. */
    albums: readonly ImmichAlbum[] | null;
    membership: ReadonlyMap<string, AlbumMembership>;
    busyAlbumIds: ReadonlySet<string>;
    /** Why an album's last whole-album select failed. */
    albumFailures: ReadonlyMap<string, BrowseFailure>;
    selectedIds: ReadonlySet<string>;
    thumbnailUrl: (photoId: string) => string;
    onOpen: (album: ImmichAlbum) => void;
    onToggle: (album: ImmichAlbum) => void;
  } = $props();

  const SHIMMER_CARDS = 6;
  const { t, formatDayRange } = getTranslator();

  function meta(album: ImmichAlbum): string {
    const photos = t("immich.photos", { count: album.photoCount });
    if (album.startDate === null || album.endDate === null) return photos;
    return t("immich.albumMeta", {
      photos,
      range: formatDayRange(album.startDate, album.endDate),
    });
  }
</script>

<ul class="albums">
  {#if albums === null}
    {#each { length: SHIMMER_CARDS }, index (index)}
      <li class="album" aria-hidden="true"><div class="cover pending"></div></li>
    {/each}
  {:else}
    {#each albums as album (album.id)}
      {@const pick = albumPick(membership.get(album.id), selectedIds)}
      {@const busy = busyAlbumIds.has(album.id)}
      {@const failure = albumFailures.get(album.id)}
      <li class="album" class:picked={pick.selected > 0}>
        <button class="open" type="button" onclick={() => onOpen(album)}>
          <span class="cover" class:pending={busy}>
            {#if album.coverId !== null}
              <img src={thumbnailUrl(album.coverId)} alt="" loading="lazy" decoding="async" />
            {/if}
            {#if pick.selected > 0}
              <span class="badge">
                {pick.all
                  ? t("immich.albumAllSelected")
                  : t("immich.albumSelected", { count: pick.selected })}
              </span>
            {/if}
          </span>
          <span class="name">{album.name}</span>
          <span class="meta mono">{meta(album)}</span>
          {#if failure !== undefined}
            <span class="failed" role="alert">{t(browseFailureMessages(failure).line)}</span>
          {/if}
        </button>
        {#if album.photoCount > 0}
          <button
            class="check"
            class:on={pick.all}
            class:partial={pick.selected > 0 && !pick.all}
            type="button"
            aria-pressed={pick.all}
            aria-busy={busy}
            disabled={busy}
            aria-label={pick.all ? t("immich.deselectAlbum") : t("immich.selectAlbum")}
            title={pick.all ? t("immich.deselectAlbum") : t("immich.selectAlbum")}
            onclick={() => onToggle(album)}
          >
            <Icon name={pick.selected > 0 && !pick.all ? "plus" : "check"} />
          </button>
        {/if}
      </li>
    {/each}
  {/if}
</ul>

<style>
  .albums {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .album {
    position: relative;
    /* Keeps the check circle and the badge below the sticky footer. */
    isolation: isolate;
  }
  .open {
    display: grid;
    gap: 8px;
    width: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .cover {
    position: relative;
    display: block;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    border-radius: var(--gl-radius-large);
    background: var(--gl-hover);
  }
  .cover img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  /* Above the cover photo, which would hide an outline. */
  .picked .cover::before {
    content: "";
    position: absolute;
    z-index: 1;
    inset: 0;
    border: 3px solid var(--gl-accent);
    border-radius: inherit;
  }
  .badge {
    z-index: 1;
  }
  .name {
    padding: 0 2px;
    font-weight: var(--gl-weight-semibold);
  }
  .failed {
    padding: 0 2px;
    color: var(--gl-danger-text);
    font-size: var(--gl-size-small);
  }
  .meta {
    margin-top: -6px;
    padding: 0 2px;
    overflow: hidden;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .badge {
    position: absolute;
    right: 8px;
    bottom: 8px;
    padding: 3px 9px;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-accent);
    color: var(--gl-accent-ink);
    font-weight: var(--gl-weight-semibold);
    font-size: var(--gl-size-caption);
  }
  .check {
    --gl-icon-size: var(--gl-size-icon-small);
    position: absolute;
    z-index: 1;
    top: 8px;
    left: 8px;
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    padding: 0;
    border: 2px solid var(--gl-on-photo);
    border-radius: 50%;
    background: var(--gl-photo-badge);
    color: transparent;
    cursor: pointer;
  }
  .check.on,
  .check.partial {
    border-color: var(--gl-accent);
    background: var(--gl-accent);
    color: var(--gl-accent-ink);
  }
  .check:disabled {
    cursor: progress;
  }
  .pending::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(100deg, transparent 30%, var(--gl-scrim) 50%, transparent 70%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite linear;
  }
  @keyframes shimmer {
    to {
      background-position: -200% 0;
    }
  }
  @container (max-width: 720px) {
    .albums {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .pending::after {
      animation: none;
    }
  }
</style>
