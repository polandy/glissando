<script lang="ts">
  import { DEFAULT_SLIDESHOW_TRANSITION } from "../../../library/own-timing";
  import Icon from "../../components/Icon.svelte";
  import { getTranslator } from "../../i18n/context";
  import type { SlideshowDetails, SlideshowStorage } from "../view-models";
  import StorageRow from "./StorageRow.svelte";
  import PanelActionRow from "./PanelActionRow.svelte";
  import SaveAsRow from "./SaveAsRow.svelte";
  import TitleEditor from "./TitleEditor.svelte";

  /**
   * Beside the pictures: the title (renamed in place), "Play", the "Save as" row (video, web
   * page) and the slideshow's facts.
   */
  let {
    slideshow,
    onPlay,
    storage = null,
    onSaveVideo,
    onSaveWebPage,
    onRename,
    onEditMusic,
    onEditTransitions,
  }: {
    slideshow: SlideshowDetails;
    onPlay: () => void;
    /** Where the slideshow lives; null while the server library is off. */
    storage?: SlideshowStorage | null;
    /** Opens the video export sheet. */
    onSaveVideo: () => void;
    /** Opens the web page export sheet. */
    onSaveWebPage: () => void;
    onRename: (typed: string) => void;
    onEditMusic: () => void;
    /** Opens the sheet of the slideshow's default transition. */
    onEditTransitions: () => void;
  } = $props();

  let transitionsRow: PanelActionRow;
  let saveAs: SaveAsRow;

  /** The video export sheet closed: focus goes back to its button. */
  export function focusSaveVideo(): void {
    saveAs.focusVideo();
  }

  /** The web page export sheet closed: focus goes back to its button. */
  export function focusSaveWebPage(): void {
    saveAs.focusWebPage();
  }

  /** The transitions sheet closed: focus goes back to the row it was opened from. */
  export function focusTransitions(): void {
    transitionsRow.focus();
  }

  const { t, formatDuration, formatDate } = getTranslator();

  const dateRange = $derived.by(() => {
    const from = formatDate(slideshow.capturedFrom);
    const to = formatDate(slideshow.capturedTo);
    return from === to ? from : t("slideshow.dateRange", { from, to });
  });
  /**
   * Named beside the duration when the slideshow does not end with the music, as displayed:
   * two seconds counts that round to the same duration never show it twice.
   */
  const differingMusicSeconds = $derived(
    slideshow.musicSeconds !== null &&
      formatDuration(slideshow.musicSeconds) !== formatDuration(slideshow.durationSeconds)
      ? slideshow.musicSeconds
      : null,
  );
  const musicSummary = $derived.by(() => {
    const summary = slideshow.musicSummary;
    if (summary === null) {
      return "";
    }
    const excerpt =
      summary.excerpt === null
        ? null
        : t("slideshow.musicExcerpt", {
            from: formatDuration(summary.excerpt.fromSeconds),
            to: formatDuration(summary.excerpt.toSeconds),
          });
    const fades = summary.fades === null ? null : t(`slideshow.musicFades-${summary.fades}`);
    if (excerpt !== null && fades !== null) {
      return t("slideshow.musicSummary", { excerpt, fades });
    }
    return excerpt ?? fades ?? t("slideshow.musicWholeTrack");
  });
  const transitionSummary = $derived.by(() => {
    const choice =
      slideshow.transition === DEFAULT_SLIDESHOW_TRANSITION
        ? t("slideshow.transitionDefault")
        : t("slideshow.transitionOwnChoice");
    return slideshow.ownTransitionCount === 0
      ? choice
      : t("slideshow.transitionSummary", {
          choice,
          own: t("slideshow.transitionOwnCount", { count: slideshow.ownTransitionCount }),
        });
  });
</script>

<aside class="panel">
  <div>
    <div class="eyebrow">{t("slideshow.eyebrow")}</div>
    <TitleEditor title={slideshow.title} {onRename} />
    <div class="muted mono range">{dateRange}</div>
  </div>
  <div class="actions">
    <button class="btn primary large" type="button" onclick={onPlay}>
      <Icon name="play" />{t("slideshow.play")}
    </button>
    <SaveAsRow bind:this={saveAs} {onSaveVideo} {onSaveWebPage} />
    {#if storage !== null}
      <StorageRow {storage} />
    {/if}
  </div>
  <dl class="rows">
    <div>
      <dt>{t("slideshow.pictures")}</dt>
      <dd class="mono">{slideshow.pictures.length}</dd>
    </div>
    <div>
      <dt>{t("slideshow.duration")}</dt>
      <dd class="mono">
        {formatDuration(slideshow.durationSeconds)}
        {#if differingMusicSeconds !== null}
          <small>
            · {t("slideshow.musicLength", { duration: formatDuration(differingMusicSeconds) })}
          </small>
        {/if}
      </dd>
    </div>
    {#if slideshow.musicTitle === null}
      <div>
        <dt>{t("slideshow.music")}</dt>
        <dd>{t("slideshow.noMusic")}</dd>
      </div>
    {:else}
      <div class="action-row">
        <PanelActionRow
          name="music"
          label={t("slideshow.music")}
          value={slideshow.musicTitle}
          summary={musicSummary}
          action={t("slideshow.edit")}
          onclick={onEditMusic}
        />
      </div>
    {/if}
    <div>
      <dt>{t("slideshow.pictureTimes")}</dt>
      <dd>
        <span class="pill"
          ><i></i>{slideshow.ownDurationCount > 0
            ? t("slideshow.automaticWithOwn", { count: slideshow.ownDurationCount })
            : t("slideshow.automatic")}</span
        >
      </dd>
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
    <div class="action-row">
      <PanelActionRow
        bind:this={transitionsRow}
        name="transitions"
        label={t("slideshow.transitions")}
        value={t(`effect.${slideshow.transition}`)}
        summary={transitionSummary}
        action={t("slideshow.change")}
        onclick={onEditTransitions}
      />
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
  .actions {
    display: grid;
    gap: 10px;
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
  .rows small {
    color: var(--gl-muted);
    font-size: inherit;
    font-weight: var(--gl-weight-regular);
  }
  /* The music and transitions rows open their editors (PanelActionRow). */
  .rows .action-row {
    display: block;
    padding: 6px 0;
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
