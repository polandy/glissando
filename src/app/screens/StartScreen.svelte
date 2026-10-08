<script lang="ts">
  import type { Snippet } from "svelte";
  import Header from "../components/Header.svelte";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import type { SlideshowSummary } from "./view-models";

  let {
    slideshows,
    onCreate,
    onOpen,
    onSettings,
    logo,
  }: {
    /** Newest first. */
    slideshows: readonly SlideshowSummary[];
    onCreate: () => void;
    onOpen: (slideshowId: string) => void;
    onSettings: () => void;
    logo?: Snippet | undefined;
  } = $props();

  const { t, formatDuration } = getTranslator();
</script>

<div class="screen">
  <Header crumbs={[]} {actions} />
  {#snippet actions()}
    <button
      class="icon-btn"
      type="button"
      title={t("settings.open")}
      aria-label={t("settings.open")}
      onclick={onSettings}
    >
      <Icon name="gear" />
    </button>
    <!-- An empty library has the large button in the hero instead. -->
    {#if slideshows.length > 0}
      <button class="btn primary" type="button" onclick={onCreate}>
        <Icon name="plus" />{t("start.newSlideshow")}
      </button>
    {/if}
  {/snippet}
  <main class="content">
    {#if logo}
      <div class="logo">{@render logo()}</div>
    {/if}
    {#if slideshows.length === 0}
      <div class="hero">
        <h1 class="title">{t("start.heroTitle")}</h1>
        <p class="lead">{t("start.heroText")}</p>
        <button class="btn primary large" type="button" onclick={onCreate}>
          <Icon name="plus" />{t("start.newSlideshow")}
        </button>
      </div>
    {:else}
      <div>
        <div class="eyebrow">{t("start.library")}</div>
        <h1 class="title">{t("start.yourSlideshows")}</h1>
      </div>
      <ul class="grid">
        {#each slideshows as slideshow (slideshow.id)}
          <li>
            <button class="show" type="button" onclick={() => onOpen(slideshow.id)}>
              <span class="cover pictures-{slideshow.coverUrls.length}">
                {#each slideshow.coverUrls as coverUrl, index (index)}
                  <img src={coverUrl} alt="" />
                {/each}
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
              </span>
            </button>
          </li>
        {/each}
        <li>
          <button class="new" type="button" onclick={onCreate}>
            <Icon name="plus" />{t("start.newSlideshow")}
          </button>
        </li>
      </ul>
    {/if}
  </main>
  <footer class="status"><span class="dot"></span>{t("start.footer")}</footer>
</div>

<style>
  .logo {
    display: flex;
    justify-content: center;
    padding-top: 8px;
  }
  .hero {
    display: grid;
    justify-items: center;
    gap: 14px;
    max-width: 520px;
    margin: 0 auto;
    text-align: center;
  }
  .hero .lead {
    margin: 0;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
    gap: 18px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .grid li {
    display: grid;
  }
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
  .show:hover {
    box-shadow: var(--gl-shadow);
    transform: translateY(-1px);
  }
  /* One large picture and two small ones; fewer pictures take the free cells. */
  .cover {
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
  .pictures-2 img:last-child {
    grid-row: 1 / 3;
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
  }
  .music {
    display: flex;
    --gl-icon-size: var(--gl-size-icon-small);
  }
  .new {
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 8px;
    min-height: 200px;
    border: 1.5px dashed var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: transparent;
    color: var(--gl-muted);
    font: inherit;
    font-weight: var(--gl-weight-semibold);
    cursor: pointer;
  }
  .new:hover {
    border-color: var(--gl-accent);
    color: var(--gl-ink);
  }
  .status {
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 24px;
    border-top: 1px solid var(--gl-line);
    background: var(--gl-surface);
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--gl-mint);
  }
  @container (max-width: 720px) {
    .grid {
      grid-template-columns: 1fr;
      gap: 14px;
    }
    .status {
      padding: 10px 16px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .show {
      transition: none;
    }
  }
</style>
