<script lang="ts">
  import type { SlideshowSearch } from "../../library/focus-pass";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import FocusSearchLine from "./FocusSearchLine.svelte";
  import type { SlideshowSummary } from "./view-models";

  let {
    slideshow,
    search,
    onServer = false,
    offline = false,
    onOpen,
  }: {
    slideshow: SlideshowSummary;
    search?: SlideshowSearch | undefined;
    /** A server slideshow: its cover carries the "Server" chip. */
    onServer?: boolean;
    /** The server is out of reach: the card is greyed out and does not open. */
    offline?: boolean;
    onOpen: (slideshowId: string) => void;
  } = $props();

  const { t, formatDuration } = getTranslator();
</script>

<button
  class="show"
  class:offline
  type="button"
  aria-disabled={offline ? "true" : undefined}
  onclick={() => {
    if (!offline) onOpen(slideshow.id);
  }}
>
  <span class="cover pictures-{slideshow.coverUrls.length}">
    {#each slideshow.coverUrls as coverUrl, index (index)}
      <img src={coverUrl} alt="" />
    {/each}
    {#if onServer}
      <span class="chip"><Icon name="server" />{t("server.chip")}</span>
    {/if}
  </span>
  <span class="meta">
    <span class="name">{slideshow.title}</span>
    <span class="facts">
      <span class="mono">
        {t("units.pictures", { count: slideshow.pictureCount })}
      </span>
      <span class="mono">{formatDuration(slideshow.durationSeconds)}</span>
      {#if slideshow.hasMusic}
        <span class="music" role="img" aria-label={t("start.withMusic")}>
          <Icon name="music" />
        </span>
      {/if}
    </span>
    {#if offline}
      <span class="facts"><Icon name="cloudOff" />{t("server.needsServer")}</span>
    {/if}
    {#if search !== undefined}
      <FocusSearchLine {search} />
    {/if}
  </span>
</button>

<style>
  .show {
    display: grid;
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
    color: inherit;
    text-align: left;
    cursor: pointer;
    transition:
      transform 0.15s,
      box-shadow 0.15s;
  }
  .show:hover:not(.offline) {
    box-shadow: var(--gl-shadow);
    transform: translateY(-1px);
  }
  .offline {
    cursor: default;
  }
  .offline .cover,
  .offline .name {
    opacity: 0.5;
  }
  /* One large picture and two small ones; fewer pictures take the free cells. */
  .cover {
    position: relative;
    display: grid;
    grid-template-columns: 2fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 2px;
    aspect-ratio: 16 / 10;
    background: var(--gl-line);
  }
  .cover img {
    width: 100%;
    height: 100%;
    min-height: 0;
    object-fit: cover;
  }
  .cover img:first-child {
    grid-row: 1 / 3;
  }
  .pictures-1 img:first-child {
    grid-column: 1 / 3;
  }
  .pictures-2 img:nth-child(2) {
    grid-row: 1 / 3;
  }
  .chip {
    position: absolute;
    top: 8px;
    left: 8px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-surface);
    color: var(--gl-ink);
    font-size: var(--gl-size-meta);
    font-weight: var(--gl-weight-semibold);
    --gl-icon-size: var(--gl-size-icon-small);
  }
  .meta {
    display: grid;
    gap: 4px;
    padding: 12px 14px 14px;
  }
  .name {
    overflow: hidden;
    font-family: var(--gl-font-display);
    font-weight: var(--gl-weight-title);
    font-size: var(--gl-size-name);
    letter-spacing: var(--gl-tracking-title);
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .facts {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
    --gl-icon-size: var(--gl-size-icon-small);
  }
  .music {
    display: flex;
  }
  @media (prefers-reduced-motion: reduce) {
    .show {
      transition: none;
    }
  }
</style>
