<script lang="ts">
  import type { Snippet } from "svelte";
  import Header from "../components/Header.svelte";
  import { getTranslator } from "../i18n/context";
  import { ICONS } from "../icons";
  import type { SlideshowSummary } from "./view-models";

  let {
    slideshows,
    onCreate,
    onOpen,
    logo,
  }: {
    /** Newest first. */
    slideshows: readonly SlideshowSummary[];
    onCreate: () => void;
    onOpen: (slideshowId: string) => void;
    logo?: Snippet;
  } = $props();

  const { t, formatDuration } = getTranslator();

  function cardMeta(slideshow: SlideshowSummary): string {
    return t("start.cardMeta", {
      pictures: t("units.pictures", { count: slideshow.pictureCount }),
      duration: formatDuration(slideshow.durationSeconds),
    });
  }
</script>

<div class="screen">
  <Header crumbs={[]} />
  <main>
    {#if logo}
      <div class="logo">{@render logo()}</div>
    {/if}
    <div class="hero">
      {#if slideshows.length === 0}
        <h1>{t("start.heroTitle")}</h1>
        <p class="muted">{t("start.heroText")}</p>
      {/if}
      <p class="create">
        <button class="btn primary" type="button" onclick={onCreate}>
          <span aria-hidden="true">{ICONS.add}</span>{t("start.newSlideshow")}
        </button>
      </p>
    </div>
    {#if slideshows.length > 0}
      <h2>{t("start.yourSlideshows")}</h2>
      <ul class="list">
        {#each slideshows as slideshow (slideshow.id)}
          <li>
            <button class="card show" type="button" onclick={() => onOpen(slideshow.id)}>
              <img class="cover" src={slideshow.coverUrl} alt="" />
              <span class="text">
                <b>{slideshow.title}</b>
                <span class="muted">
                  {cardMeta(slideshow)}
                  {#if slideshow.hasMusic}
                    · <span aria-label={t("start.withMusic")}>{ICONS.music}</span>
                  {/if}
                </span>
              </span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </main>
  <footer class="muted">{t("start.footer")}</footer>
</div>

<style>
  main {
    flex: 1;
    padding: 8px 16px 24px;
  }
  .logo {
    display: flex;
    justify-content: center;
    margin: 24px 0 10px;
  }
  .hero {
    max-width: 480px;
    margin: 0 auto;
    text-align: center;
  }
  h1 {
    margin: 8px 0 6px;
    font-weight: var(--gl-weight-heading);
    font-size: var(--gl-size-heading);
    line-height: 1.1;
  }
  .hero p {
    margin: 6px 0;
    line-height: 1.4;
  }
  .hero .create {
    margin-top: 18px;
  }
  h2 {
    margin: 22px 0 8px;
    font-weight: var(--gl-weight-heading);
    font-size: var(--gl-size-title);
  }
  .list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
    margin: 10px 0 0;
    padding: 0;
    list-style: none;
  }
  .show {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 10px;
    border: 0;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .show:hover,
  .show:focus-visible {
    outline: 3px solid var(--gl-mint);
  }
  .cover {
    flex: none;
    width: 84px;
    height: 62px;
    border-radius: var(--gl-radius-thumb);
    object-fit: cover;
  }
  .text {
    min-width: 0;
  }
  .text b {
    display: block;
    overflow: hidden;
    font-weight: var(--gl-weight-heading);
    font-size: var(--gl-size-title);
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  footer {
    padding: 10px 16px;
  }
</style>
