<script lang="ts">
  import type { Snippet } from "svelte";
  import type { BrowseFailure } from "../../immich/browse-failure";
  import type { PhotoFeed } from "../../immich/photo-feed";
  import { getTranslator } from "../i18n/context";
  import BrowseState from "./BrowseState.svelte";
  import HiddenNote from "./HiddenNote.svelte";
  import {
    sourcePick,
    browseFailureMessages,
    type SourceMembership,
    type AlreadyIn,
  } from "./immich-view";

  /** One album, person or folder: Select all n / Select none, then its pictures by day. */
  let {
    feed,
    emptyTitle,
    emptyText,
    declaredCount,
    membership,
    busy,
    failure,
    selectedIds,
    alreadyIn,
    onToggleAll,
    feedView,
  }: {
    feed: PhotoFeed;
    emptyTitle: string;
    emptyText: string;
    /** What Immich says the source holds, videos included; null where it does not say. */
    declaredCount: number | null;
    membership: SourceMembership | undefined;
    busy: boolean;
    /** Why the last Select all failed, or null; the button tries again. */
    failure: BrowseFailure | null;
    selectedIds: ReadonlySet<string>;
    alreadyIn: AlreadyIn;
    onToggleAll: () => void;
    feedView: Snippet<[PhotoFeed]>;
  } = $props();

  const { t } = getTranslator();
  // svelte-ignore state_referenced_locally
  let feedState = $state.raw(feed.state);
  $effect(() => feed.subscribe((next) => (feedState = next)));

  const pick = $derived(sourcePick(membership, selectedIds, alreadyIn));
  /** Known once every page is read; until then a declared count still includes its videos. */
  const photoCount = $derived(membership?.complete ? membership.photos.size : null);
  const shownCount = $derived(photoCount ?? declaredCount);
  const videosHidden = $derived(
    photoCount === null || declaredCount === null ? 0 : declaredCount - photoCount,
  );
  const hiddenTotal = $derived(feedState.hiddenTakenAt.length);
  const empty = $derived(
    declaredCount === 0 ||
      photoCount === 0 ||
      (feedState.done && feedState.photos.length === 0 && hiddenTotal === 0),
  );
</script>

{#if empty}
  <BrowseState icon="image" title={emptyTitle} text={emptyText} />
{:else}
  <div class="selbar">
    <span class="count">
      {#if shownCount !== null}<span>{t("immich.photos", { count: shownCount })}</span>{/if}
      {#if videosHidden > 0}· {t("immich.videosHidden", { count: videosHidden })}{/if}
      {#if hiddenTotal > 0}· <HiddenNote count={hiddenTotal} />{/if}
      {#if pick.alreadyIn > 0}· {t("immich.albumAlreadyIn", { count: pick.alreadyIn })}{/if}
    </span>
    <button class="btn small" type="button" disabled={busy} onclick={onToggleAll}>
      {#if pick.all}
        {t("immich.selectNone")}
      {:else if photoCount !== null}
        {t("immich.selectAll", { count: photoCount - pick.alreadyIn })}
      {:else}
        {t("immich.selectAllUncounted")}
      {/if}
    </button>
  </div>
  {#if failure !== null}
    <p class="failed" role="alert">{t(browseFailureMessages(failure).line)}</p>
  {/if}
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
  .failed {
    margin: 0;
    color: var(--gl-danger-text);
    font-size: var(--gl-size-label);
  }
  .count {
    flex: 1;
    color: var(--gl-muted);
    font-size: var(--gl-size-label);
  }
</style>
