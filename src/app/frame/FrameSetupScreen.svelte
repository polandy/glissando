<script lang="ts">
  import type { BrowseFailure } from "../../immich/browse-failure";
  import type { ImmichAlbum } from "../../immich/immich-client";
  import { FRAME_INTERVAL_SECONDS, type FrameIntervalSeconds } from "./frame-preferences";
  import { FRAME_ORDERS, type FrameOrder } from "../../frame/frame-deck";
  import FrameAlbumPicker from "./FrameAlbumPicker.svelte";
  import Header from "../components/Header.svelte";
  import Notice from "../components/Notice.svelte";
  import { getTranslator } from "../i18n/context";
  import type { MessageKey } from "../i18n/messages";

  let {
    albums,
    failure,
    selectedAlbumId,
    intervalSeconds,
    order,
    showClock,
    showDate,
    canCopyLink,
    linkCopied,
    thumbnailUrl,
    onBack,
    onSelectAlbum,
    onBackToAlbums,
    onInterval,
    onOrder,
    onShowClock,
    onShowDate,
    onCopyLink,
    onStart,
    onRetry,
  }: {
    /** Null while loading. */
    albums: readonly ImmichAlbum[] | null;
    failure: BrowseFailure | null;
    selectedAlbumId: string | null;
    intervalSeconds: FrameIntervalSeconds;
    order: FrameOrder;
    showClock: boolean;
    showDate: boolean;
    canCopyLink: boolean;
    linkCopied: boolean;
    thumbnailUrl: (photoId: string) => string;
    onBack: () => void;
    onSelectAlbum: (albumId: string) => void;
    onBackToAlbums: () => void;
    onInterval: (seconds: FrameIntervalSeconds) => void;
    onOrder: (order: FrameOrder) => void;
    onShowClock: (on: boolean) => void;
    onShowDate: (on: boolean) => void;
    onCopyLink: () => void;
    onStart: () => void;
    onRetry: () => void;
  } = $props();

  const INTERVAL_KEYS: Record<FrameIntervalSeconds, MessageKey> = {
    10: "frame.interval10",
    30: "frame.interval30",
    60: "frame.interval60",
    300: "frame.interval300",
  };
  const ORDER_KEYS: Record<FrameOrder, MessageKey> = {
    shuffled: "frame.orderShuffled",
    newestFirst: "frame.orderNewestFirst",
    oldestFirst: "frame.orderOldestFirst",
  };

  const { t } = getTranslator();
  const selectedAlbum = $derived(albums?.find((album) => album.id === selectedAlbumId) ?? null);
  const emptyAlbum = $derived(selectedAlbum !== null && selectedAlbum.photoCount === 0);
</script>

<div class="screen">
  <Header crumbs={[t("frame.title")]} {onBack} />
  <main class="content">
    {#if emptyAlbum && selectedAlbum !== null}
      <Notice tone="warn">
        {t("frame.emptyAlbumText", { album: selectedAlbum.name })}
        {#snippet actions()}
          <button class="btn ghost" type="button" onclick={onBackToAlbums}>
            {t("frame.backToAlbums")}
          </button>
        {/snippet}
      </Notice>
    {:else}
      <p class="sub">{t("frame.intro")}</p>
      <section>
        <FrameAlbumPicker
          {albums}
          {failure}
          {selectedAlbumId}
          {thumbnailUrl}
          {onSelectAlbum}
          {onRetry}
        />
      </section>
      <section>
        <p class="lab">{t("frame.intervalLabel")}</p>
        <div class="opt">
          {#each FRAME_INTERVAL_SECONDS as seconds (seconds)}
            <button
              type="button"
              aria-pressed={seconds === intervalSeconds}
              onclick={() => onInterval(seconds)}
            >
              {t(INTERVAL_KEYS[seconds])}
            </button>
          {/each}
        </div>
      </section>
      <section>
        <p class="lab">{t("frame.orderLabel")}</p>
        <div class="opt">
          {#each FRAME_ORDERS as choice (choice)}
            <button type="button" aria-pressed={choice === order} onclick={() => onOrder(choice)}>
              {t(ORDER_KEYS[choice])}
            </button>
          {/each}
        </div>
      </section>
      <div class="row">
        <div>
          <b>{t("frame.showClock")}</b>
          <small>{t("frame.showClockHint")}</small>
        </div>
        <label class="switch">
          <input
            type="checkbox"
            role="switch"
            checked={showClock}
            onchange={(event) => onShowClock(event.currentTarget.checked)}
          />
          <span class="track" aria-hidden="true"></span>
        </label>
      </div>
      <div class="row">
        <div>
          <b>{t("frame.showDate")}</b>
          <small>{t("frame.showDateHint")}</small>
        </div>
        <label class="switch">
          <input
            type="checkbox"
            role="switch"
            checked={showDate}
            onchange={(event) => onShowDate(event.currentTarget.checked)}
          />
          <span class="track" aria-hidden="true"></span>
        </label>
      </div>
    {/if}
  </main>
  <div class="foot">
    <span class="grow">
      {#if selectedAlbum !== null && !emptyAlbum}
        {t("frame.footerSummary", { count: selectedAlbum.photoCount })}
      {/if}
    </span>
    {#if canCopyLink}
      <button
        class="btn ghost"
        type="button"
        disabled={selectedAlbumId === null}
        onclick={onCopyLink}
      >
        {linkCopied ? t("frame.linkCopied") : t("frame.copyLink")}
      </button>
    {/if}
    <button
      class="btn"
      type="button"
      disabled={selectedAlbumId === null || emptyAlbum}
      onclick={onStart}
    >
      {t("frame.start")}
    </button>
  </div>
</div>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .content {
    flex: 1;
    overflow: auto;
    display: grid;
    gap: 18px;
    align-content: start;
    padding: 18px 20px;
  }
  .sub {
    margin: 0;
    color: var(--gl-muted);
    line-height: 1.45;
  }
  .lab {
    margin: 0 0 8px;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
    font-weight: var(--gl-weight-semibold);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .opt {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .opt button {
    padding: 7px 14px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-pill);
    background: var(--gl-surface);
    color: var(--gl-ink);
    font: inherit;
    font-weight: var(--gl-weight-medium);
    cursor: pointer;
  }
  .opt button[aria-pressed="true"] {
    border-color: var(--gl-ink);
    background: var(--gl-ink);
    color: var(--gl-ground);
  }
  .row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-radius: var(--gl-radius);
    background: var(--gl-surface);
  }
  .row div {
    flex: 1;
  }
  .row small {
    display: block;
    margin-top: 2px;
    color: var(--gl-muted);
  }
  .switch input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .track {
    position: relative;
    display: block;
    width: 38px;
    height: 22px;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-line);
    transition: background-color 0.15s;
  }
  .track::after {
    content: "";
    position: absolute;
    top: 2px;
    left: 2px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--gl-surface);
    box-shadow: var(--gl-shadow);
    transition: transform 0.15s;
  }
  .switch input:checked + .track {
    background: var(--gl-accent);
  }
  .switch input:checked + .track::after {
    transform: translateX(16px);
  }
  .foot {
    display: flex;
    flex: none;
    align-items: center;
    gap: 10px;
    padding: 12px 20px;
    border-top: 1px solid var(--gl-line);
    background: var(--gl-surface);
  }
  .grow {
    flex: 1;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
</style>
