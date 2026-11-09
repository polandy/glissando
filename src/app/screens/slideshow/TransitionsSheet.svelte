<script lang="ts">
  import { onDestroy } from "svelte";
  import { MOOD_PROFILES } from "../../../compose/mood-settings";
  import {
    ALTERNATE_TRANSITION,
    CUT_TRANSITION,
    DEFAULT_SLIDESHOW_TRANSITION,
    SLIDESHOW_TRANSITIONS,
    type SlideshowTransition,
  } from "../../../library/own-timing";
  import ResetButton from "../../components/ResetButton.svelte";
  import SectionHead from "../../components/SectionHead.svelte";
  import Sheet from "../../components/Sheet.svelte";
  import { radioGroupKeys } from "../../components/radio-group-keys";
  import { getTranslator } from "../../i18n/context";
  import type { MotionPreviewPorts } from "../../picture-editor/motion-preview";
  import { FrameTicker } from "../../picture-editor/timing/frame-ticker";
  import { TILE_STILL_MS } from "../../picture-editor/timing/preview-timeline";
  import TransitionTile from "../../picture-editor/TransitionTile.svelte";
  import { moodName } from "./mood-text";
  import type { SlideshowDetails } from "../view-models";

  /**
   * The slideshow's default transition, which every picture without its own plays. A pick is
   * stored at once; the tiles loop from the first picture into the second.
   */
  let {
    slideshow,
    ports,
    reducedMotion,
    onTransition,
    onReset,
    onClose,
  }: {
    slideshow: SlideshowDetails;
    /** The tiles' loop runs on these. */
    ports: MotionPreviewPorts;
    /** The tiles stand still half-way through their effect. */
    reducedMotion: boolean;
    onTransition: (transition: SlideshowTransition) => void;
    /** "Back to crossfade"; offered while another default is chosen. */
    onReset: () => void;
    /** "Done", the scrim, Esc. */
    onClose: () => void;
  } = $props();

  const { t } = getTranslator();

  let elapsedMs = $state(TILE_STILL_MS);
  // The ports and the motion preference are fixed while the sheet is open.
  // svelte-ignore state_referenced_locally
  const ticker = reducedMotion ? null : new FrameTicker(ports, (elapsed) => (elapsedMs = elapsed));
  onDestroy(() => ticker?.stop());

  // Under a mood the default transition is the mood's, not the stored field (ADR-0045): the
  // single settings stay untouched until a change leaves the mood.
  const moodTransition = $derived(
    slideshow.mood === undefined ? null : MOOD_PROFILES[slideshow.mood].transition,
  );
  const checkedTransition = $derived(moodTransition ?? slideshow.transition);
  const isDefault = $derived(
    moodTransition !== null || slideshow.transition === DEFAULT_SLIDESHOW_TRANSITION,
  );
  const firstUrl = $derived(slideshow.pictures[0]?.thumbnailUrl ?? null);
  // With a single picture, it stands in for the second too.
  const secondUrl = $derived(slideshow.pictures[1]?.thumbnailUrl ?? firstUrl);
  const hint = $derived(
    slideshow.mood !== undefined
      ? t("transitions.hintMood", { name: moodName(t, slideshow.mood) })
      : slideshow.transition === ALTERNATE_TRANSITION
        ? t("transitions.hintAlternate")
        : slideshow.transition === CUT_TRANSITION
          ? t("transitions.hintCut")
          : t("transitions.hintEffect", {
              effect: t(`effect.${slideshow.transition}`),
            }),
  );
  /** The pictures that keep a transition of their own, by number; the last one plays none. */
  const ownNumbers = $derived(
    slideshow.pictures.flatMap((picture, index) =>
      picture.ownTransition === null ? [] : [index + 1],
    ),
  );
  const ownNote = $derived.by(() => {
    const last = ownNumbers.at(-1);
    if (last === undefined) {
      return null;
    }
    const numbers =
      ownNumbers.length === 1
        ? String(last)
        : t("transitions.numberList", { rest: ownNumbers.slice(0, -1).join(", "), last });
    return t("transitions.ownKept", { count: ownNumbers.length, numbers });
  });

  const radios: HTMLButtonElement[] = $state([]);

  function focusCheckedTransition(): void {
    radios[SLIDESHOW_TRANSITIONS.indexOf(checkedTransition)]?.focus();
  }
</script>

<Sheet labelId="transitions-title" onOpen={focusCheckedTransition} {onClose}>
  <SectionHead
    id="transitions-title"
    title={t("transitions.title")}
    stateText={isDefault ? t("transitions.default") : t("transitions.ownChoice")}
    own={!isDefault}
  />
  <div class="tiles" role="radiogroup" aria-labelledby="transitions-title" use:radioGroupKeys>
    {#each SLIDESHOW_TRANSITIONS as choice, index (choice)}
      <TransitionTile
        bind:radio={radios[index]}
        {choice}
        checked={choice === checkedTransition}
        automatic={isDefault}
        tag={choice === DEFAULT_SLIDESHOW_TRANSITION ? t("transitions.defaultTag") : null}
        pictureUrl={firstUrl}
        nextPictureUrl={secondUrl}
        {elapsedMs}
        onPick={() => onTransition(choice)}
      />
    {/each}
  </div>
  <p class="hint">{hint}</p>
  {#if ownNote !== null}
    <p class="note">{ownNote}</p>
  {/if}
  <footer>
    <ResetButton
      automatic={isDefault}
      alreadyAutomatic={t("transitions.alreadyDefault")}
      label={t("transitions.reset")}
      {onReset}
    />
    <button class="btn primary" type="button" onclick={onClose}>{t("slideshow.done")}</button>
  </footer>
</Sheet>

<style>
  .tiles {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px 8px;
  }
  .hint {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
  .note {
    margin: 0;
    padding: 10px 12px;
    border-radius: var(--gl-radius);
    background: var(--gl-hover);
    font-size: var(--gl-size-meta);
    line-height: 1.45;
  }
  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
</style>
