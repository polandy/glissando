<script lang="ts">
  import type { ImmichPhoto } from "../../immich/immich-client";
  import { groupByDay } from "../../immich/photo-days";
  import type { PhotoFeed } from "../../immich/photo-feed";
  import { getTranslator } from "../i18n/context";
  import BrowseFailed from "./BrowseFailed.svelte";
  import type { EndObserver } from "./end-observer";
  import type { AlreadyIn } from "./immich-view";
  import PhotoDays from "./PhotoDays.svelte";

  /** A feed's photos by day; the next page loads as its end nears (see `EndObserver`). */
  let {
    feed,
    selectedIds,
    alreadyIn,
    thumbnailUrl,
    observeEnd,
    onToggle,
    onSelectDay,
    onError,
    onReload,
  }: {
    feed: PhotoFeed;
    selectedIds: ReadonlySet<string>;
    alreadyIn: AlreadyIn;
    thumbnailUrl: (photoId: string) => string;
    observeEnd: EndObserver;
    onToggle: (photo: ImmichPhoto, shown: readonly ImmichPhoto[] | null) => void;
    onSelectDay: (photos: readonly ImmichPhoto[], select: boolean) => void;
    onError: (error: unknown) => void;
    onReload: () => void;
  } = $props();

  const SHIMMER_TILES = 8;
  const { t } = getTranslator();

  // svelte-ignore state_referenced_locally
  let feedState = $state.raw(feed.state);
  $effect(() => feed.subscribe((next) => (feedState = next)));
  const days = $derived(groupByDay(feedState.photos));

  function loadMore(): void {
    feed.loadMore().catch(onError);
  }

  // Watching anew after every page: an end still in view after a short page asks again.
  function watchEnd(element: Element, photoCount: number) {
    let watchedCount = photoCount;
    let stop = observeEnd(element, loadMore);
    return {
      update(nextCount: number) {
        if (nextCount === watchedCount) return;
        watchedCount = nextCount;
        stop();
        stop = observeEnd(element, loadMore);
      },
      destroy: () => stop(),
    };
  }
</script>

<PhotoDays {days} {selectedIds} {alreadyIn} {thumbnailUrl} {onToggle} {onSelectDay} />

{#if feedState.failure !== null}
  <BrowseFailed
    failure={feedState.failure}
    onRetry={() => feed.retry().catch(onError)}
    {onReload}
  />
{:else if feedState.done}
  {#if feedState.photos.length > 0}
    <p class="end">
      {t("immich.thatsAll")} ·
      <span class="mono">{t("immich.photos", { count: feedState.photos.length })}</span>
    </p>
  {/if}
{:else}
  <ul class="grid sentinel" use:watchEnd={feedState.photos.length} aria-hidden="true">
    {#each { length: SHIMMER_TILES }, index (index)}
      <li class="pending"></li>
    {/each}
  </ul>
{/if}

<style>
  .end {
    margin: 0;
    padding: 12px 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
    text-align: center;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .pending {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: var(--gl-radius-small);
    background: var(--gl-hover);
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
    .grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 3px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .pending::after {
      animation: none;
    }
  }
</style>
