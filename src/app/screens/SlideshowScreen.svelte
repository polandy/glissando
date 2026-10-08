<script lang="ts">
  import Header from "../components/Header.svelte";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import type { SlideshowDetails } from "./view-models";

  let {
    slideshow,
    onBack,
    onPlay,
  }: {
    slideshow: SlideshowDetails;
    onBack: () => void;
    onPlay: () => void;
  } = $props();

  const { t, formatDuration, formatSeconds, formatDate } = getTranslator();

  const duration = $derived(formatDuration(slideshow.durationSeconds));
  // The pictures are in capture order, so the first and the last one span the slideshow.
  const dateRange = $derived.by(() => {
    const from = formatDate(slideshow.pictures[0]?.capturedAt ?? "");
    const to = formatDate(slideshow.pictures.at(-1)?.capturedAt ?? "");
    return from === to ? from : t("slideshow.dateRange", { from, to });
  });
  const secondsPerPicture = $derived(
    formatSeconds(slideshow.durationSeconds / slideshow.pictures.length),
  );
</script>

<div class="screen">
  <Header crumbs={[t("app.name"), slideshow.title]} {onBack} />
  <main class="content">
    <div class="detail">
      <div class="pictures">
        <button class="preview" type="button" aria-label={t("slideshow.play")} onclick={onPlay}>
          <img src={slideshow.coverUrl} alt="" />
          <span class="play"><Icon name="play" /></span>
          <span class="time mono">
            {t("player.time", { current: formatDuration(0), total: duration })}
          </span>
        </button>

        <div class="strip-head">
          <div>
            <h2 class="eyebrow">{t("slideshow.pictures")}</h2>
            <p class="muted sorted">{t("slideshow.sortedByDate")}</p>
          </div>
          <span class="mono muted">{slideshow.pictures.length}</span>
        </div>
        <ol class="strip">
          {#each slideshow.pictures as picture, index (picture.id)}
            {@const date = formatDate(picture.capturedAt)}
            <li class="tile">
              <img
                src={picture.thumbnailUrl}
                alt={t("slideshow.pictureLabel", { number: index + 1, date })}
              />
              <span class="number mono" aria-hidden="true">{index + 1}</span>
              <span class="date mono" aria-hidden="true">{date}</span>
            </li>
          {/each}
        </ol>
      </div>

      <aside class="panel">
        <div>
          <div class="eyebrow">{t("slideshow.eyebrow")}</div>
          <h1 class="title">{slideshow.title}</h1>
          <div class="muted mono range">{dateRange}</div>
        </div>
        <button class="btn primary large" type="button" onclick={onPlay}>
          <Icon name="play" />{t("slideshow.play")}
        </button>
        <dl class="rows">
          <div>
            <dt>{t("slideshow.pictures")}</dt>
            <dd class="mono">{slideshow.pictures.length}</dd>
          </div>
          <div>
            <dt>{t("slideshow.duration")}</dt>
            <dd class="mono">{duration}</dd>
          </div>
          <div>
            <dt>{t("slideshow.music")}</dt>
            <dd>{slideshow.musicTitle ?? t("slideshow.noMusic")}</dd>
          </div>
          <div>
            <dt>{t("slideshow.perPicture")}</dt>
            <dd class="mono">{secondsPerPicture}</dd>
          </div>
          <div>
            <dt>{t("slideshow.kenBurns")}</dt>
            <dd><span class="pill"><i></i>{t("slideshow.automatic")}</span></dd>
          </div>
          <div>
            <dt>{t("slideshow.transitions")}</dt>
            <dd><span class="pill"><i></i>{t("slideshow.alternating")}</span></dd>
          </div>
        </dl>
      </aside>
    </div>
  </main>
</div>

<style>
  .detail {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 24px;
    align-items: start;
  }
  .pictures {
    display: grid;
    gap: 20px;
  }
  .preview {
    position: relative;
    aspect-ratio: 16 / 9;
    padding: 0;
    overflow: hidden;
    border: 0;
    border-radius: var(--gl-radius-large);
    background: var(--gl-hover);
    cursor: pointer;
  }
  .preview img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .preview::after {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(120% 90% at 50% 40%, transparent 55%, var(--gl-photo-vignette));
  }
  .play {
    position: absolute;
    left: 50%;
    top: 50%;
    z-index: 1;
    display: grid;
    place-items: center;
    width: 64px;
    height: 64px;
    translate: -50% -50%;
    border-radius: 50%;
    background: var(--gl-photo-play-bg);
    color: var(--gl-photo-play-ink);
    box-shadow: var(--gl-photo-play-shadow);
    --gl-icon-size: var(--gl-size-icon-large);
  }
  /* The triangle's visual centre sits right of its box's centre. */
  .play :global(svg) {
    translate: 2px 0;
  }
  .time {
    position: absolute;
    left: 14px;
    bottom: 12px;
    z-index: 1;
    padding: 3px 8px;
    border-radius: var(--gl-radius-small);
    background: var(--gl-photo-badge);
    color: var(--gl-on-photo);
    font-size: var(--gl-size-small);
    backdrop-filter: blur(6px);
  }
  .strip-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
  }
  .strip-head h2 {
    margin: 0;
  }
  .sorted {
    margin: 3px 0 0;
  }
  .strip {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .tile {
    position: relative;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    border-radius: var(--gl-radius-tile);
    background: var(--gl-hover);
  }
  .tile img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .number,
  .date {
    position: absolute;
    color: var(--gl-on-photo);
    font-weight: var(--gl-weight-medium);
    font-size: var(--gl-size-caption);
  }
  .number {
    left: 6px;
    top: 6px;
    padding: 1px 6px;
    border-radius: var(--gl-radius-small);
    background: var(--gl-photo-badge);
  }
  .date {
    left: 0;
    right: 0;
    bottom: 0;
    padding: 14px 7px 5px;
    background: linear-gradient(transparent, var(--gl-photo-fade));
  }
  .panel {
    display: grid;
    gap: 16px;
    padding: 18px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
  }
  .panel .title {
    margin-top: 4px;
    font-size: var(--gl-size-panel-title);
  }
  .range {
    margin-top: 4px;
    font-size: var(--gl-size-meta);
  }
  .rows {
    display: grid;
    margin: 0;
  }
  .rows div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 9px 0;
    border-top: 1px solid var(--gl-line);
  }
  .rows dt {
    flex: none;
    color: var(--gl-muted);
  }
  .rows dd {
    min-width: 0;
    margin: 0;
    font-weight: var(--gl-weight-medium);
    text-align: right;
    overflow-wrap: anywhere;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 8px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-pill);
    background: var(--gl-scrim);
    color: var(--gl-muted);
    font-weight: var(--gl-weight-semibold);
    font-size: var(--gl-size-small);
  }
  .pill i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--gl-mint);
  }
  @container (max-width: 720px) {
    .detail {
      grid-template-columns: 1fr;
    }
    .strip {
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
    }
  }
</style>
