<script lang="ts">
  import { DEFAULT_SLIDESHOW_TRANSITION } from "../../../library/own-timing";
  import Icon from "../../components/Icon.svelte";
  import Switch from "../../components/Switch.svelte";
  import type { ChapterSettingsEditor } from "../../editing/chapter-settings-editor";
  import { getTranslator } from "../../i18n/context";
  import type { ServerSlideshowRows } from "../../server-library/server-slideshow-sessions";
  import TvControl from "../../tv-remote/TvControl.svelte";
  import type { SlideshowDetails, SlideshowStorage } from "../view-models";
  import type { FineSettingsFoldStore } from "./fine-settings-fold";
  import { moodTransitionValue } from "./mood-transition-value";
  import PanelActionRow from "./PanelActionRow.svelte";
  import StorageRow from "./StorageRow.svelte";

  /** The info panel's "Fine settings" fold (ADR-0048): folded by default, remembered per device
   * for every slideshow; holds Transitions, Portrait pictures and the Trip chapters switch, then where the
   * slideshow lives and its TV row. */
  let {
    slideshow,
    fineSettingsFold,
    storage = null,
    serverRows = null,
    onEditTransitions,
    onEditPortraitPictures,
    chapterEditor,
  }: {
    slideshow: SlideshowDetails;
    fineSettingsFold: FineSettingsFoldStore;
    storage?: SlideshowStorage | null;
    serverRows?: ServerSlideshowRows | null;
    /** Opens the sheet of the slideshow's default transition. */
    onEditTransitions: () => void;
    /** Opens the sheet of the slideshow's portrait pictures setting. */
    onEditPortraitPictures: () => void;
    /** Stores the slideshow-wide automatic-chapters switch (TRIP_CHAPTERS.md); null while unavailable. */
    chapterEditor: ChapterSettingsEditor | null;
  } = $props();

  let transitionsRow: PanelActionRow;
  let portraitPicturesRow: PanelActionRow;

  /** The transitions sheet closed: focus goes back to the row it was opened from. */
  export function focusTransitions(): void {
    transitionsRow.focus();
  }

  /** The portrait pictures sheet closed: focus goes back to the row it was opened from. */
  export function focusPortraitPictures(): void {
    portraitPicturesRow.focus();
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
  const chaptersHelper = $derived(
    slideshow.ownOrder
      ? t("chapters.automaticHelperDisabled")
      : slideshow.automaticChaptersOff
        ? t("chapters.automaticHelperOff")
        : t("chapters.automaticHelperOn"),
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
    <div class="chapters">
      <div>
        <b>{t("chapters.rowLabel")}</b>
        <small>{chaptersHelper}</small>
      </div>
      <Switch
        checked={!slideshow.automaticChaptersOff}
        disabled={slideshow.ownOrder}
        label={t("chapters.rowLabel")}
        onChange={(on) => chapterEditor?.setAutomaticChaptersOff(!on)}
      />
    </div>
  </div>
  {#if storage !== null}
    <div class="actions">
      <StorageRow {storage} />
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
  }
  .chapters {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 0;
  }
  .chapters small {
    display: block;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
    font-weight: var(--gl-weight-regular);
  }
  .actions {
    display: grid;
    gap: 10px;
  }
  @container (min-width: 721px) and (max-width: 1024px) {
    .actions {
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      align-items: start;
    }
  }
</style>
