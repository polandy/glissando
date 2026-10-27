<script lang="ts">
  import { DEFAULT_SLIDESHOW_TRANSITION } from "../../../library/own-timing";
  import Icon from "../../components/Icon.svelte";
  import { getTranslator } from "../../i18n/context";
  import type { ServerSlideshowRows } from "../../server-library/server-slideshow-sessions";
  import ShareLinkControl from "../../share-link/ShareLinkControl.svelte";
  import TvControl from "../../tv-remote/TvControl.svelte";
  import type { SlideshowDetails, SlideshowStorage } from "../view-models";
  import type { FineSettingsFoldStore } from "./fine-settings-fold";
  import { moodTransitionValue } from "./mood-transition-value";
  import PanelActionRow from "./PanelActionRow.svelte";
  import StorageRow from "./StorageRow.svelte";

  /** The info panel's "Fine settings" fold (ADR-0048): folded by default, remembered per device
   * for every slideshow; holds Transitions, Portrait pictures and Trip chapters, then where the
   * slideshow lives and its link and TV rows. */
  let {
    slideshow,
    fineSettingsFold,
    storage = null,
    serverRows = null,
    onEditTransitions,
    onEditPortraitPictures,
    onEditChapters,
  }: {
    slideshow: SlideshowDetails;
    fineSettingsFold: FineSettingsFoldStore;
    storage?: SlideshowStorage | null;
    serverRows?: ServerSlideshowRows | null;
    /** Opens the sheet of the slideshow's default transition. */
    onEditTransitions: () => void;
    /** Opens the sheet of the slideshow's portrait pictures setting. */
    onEditPortraitPictures: () => void;
    /** Opens the trip chapters sheet in general mode (TRIP_CHAPTERS.md). */
    onEditChapters: () => void;
  } = $props();

  let transitionsRow: PanelActionRow;
  let portraitPicturesRow: PanelActionRow;
  let chaptersRow: PanelActionRow;

  /** The transitions sheet closed: focus goes back to the row it was opened from. */
  export function focusTransitions(): void {
    transitionsRow.focus();
  }

  /** The portrait pictures sheet closed: focus goes back to the row it was opened from. */
  export function focusPortraitPictures(): void {
    portraitPicturesRow.focus();
  }

  /** The chapters sheet closed: focus goes back to the row it was opened from. */
  export function focusChapters(): void {
    chaptersRow.focus();
  }

  const { t } = getTranslator();

  // The fold's starting state is read once, when the panel mounts; `toggle` keeps it and the
  // store in step from then on.
  // svelte-ignore state_referenced_locally
  let open = $state(fineSettingsFold.read() === "open");
  const foldId = "slideshow-fine-settings";

  function toggle(): void {
    open = !open;
    fineSettingsFold.write(open ? "open" : "closed");
  }

  const ownTransitionSummary = $derived.by(() => {
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
  const transition = $derived(moodTransitionValue(t, slideshow, ownTransitionSummary));
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

<button class="toggle" type="button" aria-expanded={open} aria-controls={foldId} onclick={toggle}>
  {t("slideshow.fineSettings")}
  <span class="chevron" class:open><Icon name="chevronRight" /></span>
</button>
<div class="fold" class:open id={foldId}>
  <div class="rows">
    <PanelActionRow
      bind:this={transitionsRow}
      name="transitions"
      label={t("slideshow.transitions")}
      value={transition.transitionValue}
      summary={transition.transitionRowSummary}
      onclick={onEditTransitions}
    />
    <PanelActionRow
      bind:this={portraitPicturesRow}
      name="portrait"
      label={t("slideshow.portraitPictures")}
      value={t(`portrait.choice-${slideshow.portraitPictures}`)}
      summary={portraitPicturesSummary}
      onclick={onEditPortraitPictures}
    />
    <PanelActionRow
      bind:this={chaptersRow}
      name="chapters"
      label={t("chapters.rowLabel")}
      value={t("chapters.count", { count: visibleChapterCount })}
      summary={chaptersSummary}
      onclick={onEditChapters}
    />
  </div>
  {#if storage !== null}
    <div class="actions">
      <StorageRow {storage} />
      {#if storage.kind === "device" || serverRows !== null}
        <ShareLinkControl
          session={storage.kind === "server" ? (serverRows?.shareLink ?? null) : null}
          subject={{
            title: slideshow.title,
            pictureCount: slideshow.pictures.length,
            durationSeconds: slideshow.durationSeconds,
            hasMusic: slideshow.songCount > 0,
          }}
        />
      {/if}
      {#if storage.kind === "server" && serverRows !== null}
        <TvControl session={serverRows.tv} />
      {/if}
    </div>
  {/if}
</div>

<style>
  .toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    font-weight: var(--gl-weight-semibold);
    color: var(--gl-muted);
    cursor: pointer;
  }
  .chevron {
    display: inline-flex;
    transform: rotate(90deg);
  }
  .chevron.open {
    transform: rotate(-90deg);
  }
  .fold {
    display: none;
    gap: 16px;
  }
  .fold.open {
    display: grid;
  }
  .rows {
    display: grid;
    gap: 6px;
  }
  .actions {
    display: grid;
    gap: 10px;
  }
  @container (min-width: 721px) and (max-width: 1024px) {
    .rows {
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      align-items: start;
    }
    .actions {
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      align-items: start;
    }
  }
</style>
