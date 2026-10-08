<script lang="ts">
  import Icon from "../../components/Icon.svelte";
  import { getTranslator } from "../../i18n/context";
  import type { SlideshowDetails } from "../view-models";
  import TitleEditor from "./TitleEditor.svelte";

  /** Beside the pictures: the title (renamed in place), "Play" and the slideshow's facts. */
  let {
    slideshow,
    onPlay,
    onRename,
  }: {
    slideshow: SlideshowDetails;
    onPlay: () => void;
    onRename: (typed: string) => void;
  } = $props();

  const { t, formatDuration, formatSeconds, formatDate } = getTranslator();

  const dateRange = $derived.by(() => {
    const from = formatDate(slideshow.capturedFrom);
    const to = formatDate(slideshow.capturedTo);
    return from === to ? from : t("slideshow.dateRange", { from, to });
  });
  const secondsPerPicture = $derived(
    formatSeconds(slideshow.durationSeconds / slideshow.pictures.length),
  );
</script>

<aside class="panel">
  <div>
    <div class="eyebrow">{t("slideshow.eyebrow")}</div>
    <TitleEditor title={slideshow.title} {onRename} />
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
      <dd class="mono">{formatDuration(slideshow.durationSeconds)}</dd>
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
      <dd>
        <span class="pill"
          ><i></i>{slideshow.ownMotionCount > 0
            ? t("slideshow.automaticWithOwn", { count: slideshow.ownMotionCount })
            : t("slideshow.automatic")}</span
        >
      </dd>
    </div>
    <div>
      <dt>{t("slideshow.transitions")}</dt>
      <dd><span class="pill"><i></i>{t("slideshow.alternating")}</span></dd>
    </div>
    <div>
      <dt>{t("slideshow.captions")}</dt>
      <dd class="mono">
        {t("slideshow.captionCount", {
          count: slideshow.captionCount,
          total: slideshow.pictures.length,
        })}
      </dd>
    </div>
  </dl>
</aside>

<style>
  .panel {
    display: grid;
    gap: 16px;
    padding: 18px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
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
</style>
