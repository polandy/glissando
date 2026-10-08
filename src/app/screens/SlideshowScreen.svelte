<script lang="ts">
  import Header, { type BackgroundActivity } from "../components/Header.svelte";
  import { getTranslator } from "../i18n/context";
  import { ICONS } from "../icons";
  import type { SlideshowDetails } from "./view-models";

  let {
    slideshow,
    onBack,
    onPlay,
    activity = null,
  }: {
    slideshow: SlideshowDetails;
    onBack: () => void;
    onPlay: () => void;
    activity?: BackgroundActivity | null;
  } = $props();

  const { t, formatDuration, formatSeconds, formatDate } = getTranslator();

  const meta = $derived(
    t("slideshow.meta", {
      pictures: t("units.pictures", { count: slideshow.pictures.length }),
      duration: formatDuration(slideshow.durationSeconds),
    }),
  );
  const music = $derived(
    slideshow.musicTitle === null
      ? t("slideshow.noMusic")
      : `${ICONS.music} ${t("slideshow.music", { track: slideshow.musicTitle })}`,
  );
  const secondsPerPicture = $derived(
    t("slideshow.secondsPerPicture", {
      seconds: formatSeconds(slideshow.durationSeconds / slideshow.pictures.length),
    }),
  );
</script>

<div class="screen">
  <Header crumbs={[t("app.name"), slideshow.title]} {onBack} {activity} />
  <main>
    <section class="card hero">
      <button class="cover" type="button" aria-label={t("slideshow.play")} onclick={onPlay}>
        <img src={slideshow.coverUrl} alt="" />
        <span class="play" aria-hidden="true"><i>{ICONS.play}</i></span>
      </button>
      <div class="meta">
        <b>{meta}</b>
        <div class="muted">{music} · {secondsPerPicture} · {t("slideshow.automatic")}</div>
      </div>
      <button class="btn primary" type="button" onclick={onPlay}>
        <span aria-hidden="true">{ICONS.play}</span>{t("slideshow.play")}
      </button>
    </section>

    <h2>{t("slideshow.pictures")}</h2>
    <p class="muted sorted">{t("slideshow.sortedByDate")}</p>
    <ol class="grid">
      {#each slideshow.pictures as picture, index (picture.id)}
        {@const date = formatDate(picture.capturedAt)}
        <li class="tile">
          <img
            src={picture.thumbnailUrl}
            alt={t("slideshow.pictureLabel", { number: index + 1, date })}
          />
          <span class="number" aria-hidden="true">{index + 1}</span>
          <span class="caption" aria-hidden="true">{date}</span>
        </li>
      {/each}
    </ol>
  </main>
</div>

<style>
  main {
    flex: 1;
    padding: 8px 16px 24px;
  }
  .hero {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px;
  }
  .cover {
    position: relative;
    flex: none;
    width: 120px;
    height: 90px;
    padding: 0;
    overflow: hidden;
    border: 0;
    border-radius: var(--gl-radius-tile);
    cursor: pointer;
  }
  .cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .play {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
  }
  .play i {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    padding-left: 4px;
    border-radius: 50%;
    background: var(--gl-peach);
    color: var(--gl-on-accent);
    font-size: var(--gl-size-title);
    font-style: normal;
    box-shadow: var(--gl-raised-shadow);
  }
  .meta {
    flex: 1;
    min-width: 0;
  }
  .meta b {
    font-weight: var(--gl-weight-heading);
    font-size: var(--gl-size-title);
  }
  @container (max-width: 699px) {
    .hero {
      flex-wrap: wrap;
    }
    .hero .btn.primary {
      width: 100%;
      justify-content: center;
    }
  }
  h2 {
    margin: 22px 0 2px;
    font-weight: var(--gl-weight-heading);
    font-size: var(--gl-size-title);
  }
  .sorted {
    margin: 0 0 4px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
    gap: 10px;
    margin: 12px 0 0;
    padding: 0;
    list-style: none;
  }
  @container (min-width: 700px) {
    .grid {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    }
  }
  .tile {
    position: relative;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    border-radius: var(--gl-radius-tile);
    background: var(--gl-surface);
  }
  .tile img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .number {
    position: absolute;
    top: 6px;
    left: 6px;
    display: grid;
    place-items: center;
    min-width: 22px;
    height: 22px;
    padding: 0 6px;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-badge-bg);
    color: var(--gl-badge-text);
    font-weight: var(--gl-weight-heading);
    font-size: var(--gl-size-caption);
  }
  .caption {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 14px 8px 5px;
    background: linear-gradient(transparent, var(--gl-caption-scrim));
    color: var(--gl-milk);
    font-size: var(--gl-size-caption);
  }
</style>
