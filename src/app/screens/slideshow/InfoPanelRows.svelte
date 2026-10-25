<script lang="ts">
  import { DEFAULT_SLIDESHOW_TRANSITION } from "../../../library/own-timing";
  import { DEFAULT_SLIDESHOW_LOOK } from "../../../player";
  import { getTranslator } from "../../i18n/context";
  import type { SlideshowDetails } from "../view-models";
  import EnergyPacingRow from "./EnergyPacingRow.svelte";
  import { infoPanelMoodValues } from "./info-panel-mood-values";
  import type { MoodEnergyPacing } from "./mood-energy-pacing";
  import { moodName } from "./mood-text";
  import PanelActionRow from "./PanelActionRow.svelte";
  import PanelFactRow from "./PanelFactRow.svelte";

  /** The slideshow's facts: pictures, duration, music, timing, transitions, look and captions. */
  let {
    slideshow,
    onEditMusic,
    onEditTransitions,
    onEditLook,
    moodBpm,
    moodEnergyPacing,
    onEditMood,
    onEnergyPacing,
    onEditPortraitPictures,
    onEditChapters,
  }: {
    slideshow: SlideshowDetails;
    onEditMusic: () => void;
    /** Opens the sheet of the slideshow's default transition. */
    onEditTransitions: () => void;
    /** Opens the sheet of the slideshow's colour grade (ADR-0044). */
    onEditLook: () => void;
    /** The slideshow's tempo under its mood (ADR-0045); undefined without one. */
    moodBpm: number | undefined;
    /** The "Picture times" range under the energy pacing (ADR-0046); null without one. */
    moodEnergyPacing: MoodEnergyPacing | null;
    /** Opens the Mood sheet. */
    onEditMood: () => void;
    /** The info panel's own "Follow the music's energy" switch (ADR-0046): stores at once. */
    onEnergyPacing: (on: boolean) => void;
    /** Opens the sheet of the slideshow's portrait pictures setting. */
    onEditPortraitPictures: () => void;
    /** Opens the trip chapters sheet in general mode (TRIP_CHAPTERS.md). */
    onEditChapters: () => void;
  } = $props();

  let transitionsRow: PanelActionRow;
  let lookRow: PanelActionRow;
  let moodRow: PanelActionRow;
  let portraitPicturesRow: PanelActionRow;
  let chaptersRow: PanelActionRow;

  /** The transitions sheet closed: focus goes back to the row it was opened from. */
  export function focusTransitions(): void {
    transitionsRow.focus();
  }

  /** The look sheet closed: focus goes back to the row it was opened from. */
  export function focusLook(): void {
    lookRow.focus();
  }

  /** The Mood sheet closed: focus goes back to the row it was opened from. */
  export function focusMood(): void {
    moodRow.focus();
  }

  /** The portrait pictures sheet closed: focus goes back to the row it was opened from. */
  export function focusPortraitPictures(): void {
    portraitPicturesRow.focus();
  }

  /** The chapters sheet closed: focus goes back to the row it was opened from. */
  export function focusChapters(): void {
    chaptersRow.focus();
  }

  const translator = getTranslator();
  const { t, formatDuration } = translator;

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
  /** One song by its name, several by their count; the playlist's length sums several up. */
  const musicValue = $derived(
    slideshow.songCount > 1
      ? t("slideshow.songCount", { count: slideshow.songCount })
      : (slideshow.musicTitle ?? t("slideshow.noMusic")),
  );
  const musicSummary = $derived.by(() => {
    if (slideshow.songCount > 1 && slideshow.musicSeconds !== null) {
      return formatDuration(slideshow.musicSeconds);
    }
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
  // A mood paces the transition, picture times and Ken Burns rows (ADR-0045); the single
  // settings underneath are unchanged.
  const moodValues = $derived(
    infoPanelMoodValues(translator, slideshow, moodBpm, transitionSummary, moodEnergyPacing),
  );
  const lookSummary = $derived(
    slideshow.look === DEFAULT_SLIDESHOW_LOOK ? t("slideshow.lookDefault") : "",
  );
  const portraitPicturesSummary = $derived(
    slideshow.pairCount === 0 ? "" : `· ${t("portrait.pairCount", { count: slideshow.pairCount })}`,
  );
  // Hidden automatic chapters are omitted (TRIP_CHAPTERS.md): the count is what the trip shows.
  const visibleChapterCount = $derived(
    slideshow.chapters.filter((chapter) => !chapter.hidden).length,
  );
  const chaptersSummary = $derived(
    slideshow.automaticChaptersOff ? t("chapters.automaticOffSummary") : "",
  );
</script>

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
  <div class="action-row">
    <PanelActionRow
      name="music"
      label={t("slideshow.music")}
      value={musicValue}
      summary={musicSummary}
      action={slideshow.songCount === 0 ? t("slideshow.addMusic") : t("slideshow.edit")}
      onclick={onEditMusic}
    />
  </div>
  <div class="action-row">
    <PanelActionRow
      bind:this={moodRow}
      name="mood"
      label={t("slideshow.mood")}
      value={moodName(t, slideshow.mood)}
      summary={slideshow.mood === undefined ? t("slideshow.moodDefault") : ""}
      action={t("slideshow.change")}
      onclick={onEditMood}
    />
  </div>
  <PanelFactRow
    label={t("slideshow.pictureTimes")}
    value={moodValues.pictureTimesValue}
    byMood={slideshow.mood !== undefined}
    note={moodValues.pictureTimesNote}
  />
  {#if slideshow.songCount > 0}
    <EnergyPacingRow on={slideshow.energyPacing} onChange={onEnergyPacing} />
  {/if}
  <PanelFactRow
    label={t("slideshow.kenBurns")}
    value={moodValues.kenBurnsValue}
    byMood={slideshow.mood !== undefined}
  />
  <div class="action-row">
    <PanelActionRow
      bind:this={transitionsRow}
      name="transitions"
      label={t("slideshow.transitions")}
      value={moodValues.transitionValue}
      summary={moodValues.transitionRowSummary}
      action={t("slideshow.change")}
      onclick={onEditTransitions}
    />
  </div>
  <div class="action-row">
    <PanelActionRow
      bind:this={lookRow}
      name="look"
      label={t("slideshow.look")}
      value={t(`look.${slideshow.look}`)}
      summary={lookSummary}
      action={t("slideshow.change")}
      onclick={onEditLook}
    />
  </div>
  <div class="action-row">
    <PanelActionRow
      bind:this={portraitPicturesRow}
      name="portrait"
      label={t("slideshow.portraitPictures")}
      value={t(`portrait.choice-${slideshow.portraitPictures}`)}
      summary={portraitPicturesSummary}
      action={t("slideshow.change")}
      onclick={onEditPortraitPictures}
    />
  </div>
  <div class="action-row">
    <PanelActionRow
      bind:this={chaptersRow}
      name="chapters"
      label={t("chapters.rowLabel")}
      value={t("chapters.count", { count: visibleChapterCount })}
      summary={chaptersSummary}
      action={t("slideshow.change")}
      onclick={onEditChapters}
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

<style>
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
  /* The music, transitions, look and portrait pictures rows open their editors (PanelActionRow). */
  .rows .action-row {
    display: block;
    padding: 6px 0;
  }
  /* Stacked above the pictures the facts pair up, so the open details stay short. */
  @container (min-width: 721px) and (max-width: 1024px) {
    .rows {
      display: block;
      column-count: 2;
      column-gap: 24px;
    }
    .rows div {
      break-inside: avoid;
    }
  }
</style>
