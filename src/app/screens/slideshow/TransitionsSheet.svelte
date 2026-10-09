<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { MAX_TRANSITION_DURATION_MS, TRANSITION_SHARE_OF_SLIDE } from "../../../compose";
  import {
    ALTERNATE_TRANSITION,
    CUT_TRANSITION,
    DEFAULT_SLIDESHOW_TRANSITION,
    SLIDESHOW_TRANSITIONS,
    type SlideshowTransition,
  } from "../../../library/own-timing";
  import { MILLISECONDS_PER_SECOND } from "../../../player";
  import ResetButton from "../../components/ResetButton.svelte";
  import SectionHead from "../../components/SectionHead.svelte";
  import { radioIndexForKey } from "../../components/radio-keys";
  import { getTranslator } from "../../i18n/context";
  import type { MotionPreviewPorts } from "../../picture-editor/motion-preview";
  import { FrameTicker } from "../../picture-editor/timing/frame-ticker";
  import { TILE_STILL_MS } from "../../picture-editor/timing/preview-timeline";
  import TransitionTile from "../../picture-editor/TransitionTile.svelte";
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
  const PERCENT = 100;

  let elapsedMs = $state(TILE_STILL_MS);
  // The ports and the motion preference are fixed while the sheet is open.
  // svelte-ignore state_referenced_locally
  const ticker = reducedMotion ? null : new FrameTicker(ports, (elapsed) => (elapsedMs = elapsed));
  onDestroy(() => ticker?.stop());

  const isDefault = $derived(slideshow.transition === DEFAULT_SLIDESHOW_TRANSITION);
  const firstUrl = $derived(slideshow.pictures[0]?.thumbnailUrl ?? null);
  // With a single picture, it stands in for the second too.
  const secondUrl = $derived(slideshow.pictures[1]?.thumbnailUrl ?? firstUrl);
  const hint = $derived(
    slideshow.transition === ALTERNATE_TRANSITION
      ? t("transitions.hintAlternate")
      : slideshow.transition === CUT_TRANSITION
        ? t("transitions.hintCut")
        : t("transitions.hintEffect", {
            effect: t(`effect.${slideshow.transition}`),
            share: TRANSITION_SHARE_OF_SLIDE * PERCENT,
            max: MAX_TRANSITION_DURATION_MS / MILLISECONDS_PER_SECOND,
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

  let dialog: HTMLDialogElement;
  const radios: HTMLButtonElement[] = $state([]);

  // The native modal dialog traps focus and makes the page behind it inert.
  onMount(() => {
    dialog.showModal();
    radios[SLIDESHOW_TRANSITIONS.indexOf(slideshow.transition)]?.focus();
    return () => dialog.close();
  });

  function cancel(event: Event): void {
    event.preventDefault();
    onClose();
  }

  // The sheet fills the dialog, so a click that lands on the dialog itself is on its backdrop.
  function closeOnScrim(event: MouseEvent): void {
    if (event.target === dialog) {
      onClose();
    }
  }

  // Selection follows focus, as in the WAI-ARIA radio group: one tab stop, arrows choose.
  function onkeydown(event: KeyboardEvent, index: number): void {
    const next = radioIndexForKey(event.key, index, SLIDESHOW_TRANSITIONS.length);
    const choice = next === null ? undefined : SLIDESHOW_TRANSITIONS[next];
    if (next === null || choice === undefined) {
      return;
    }
    event.preventDefault();
    onTransition(choice);
    radios[next]?.focus();
  }
</script>

<dialog
  bind:this={dialog}
  aria-labelledby="transitions-title"
  oncancel={cancel}
  onclick={closeOnScrim}
>
  <div class="sheet">
    <SectionHead
      id="transitions-title"
      title={t("transitions.title")}
      stateText={isDefault ? t("transitions.default") : t("transitions.ownChoice")}
      own={!isDefault}
    />
    <div class="tiles" role="radiogroup" aria-labelledby="transitions-title">
      {#each SLIDESHOW_TRANSITIONS as choice, index (choice)}
        <TransitionTile
          bind:radio={radios[index]}
          {choice}
          checked={choice === slideshow.transition}
          automatic={isDefault}
          tag={choice === DEFAULT_SLIDESHOW_TRANSITION ? t("transitions.defaultTag") : null}
          pictureUrl={firstUrl}
          nextPictureUrl={secondUrl}
          {elapsedMs}
          onPick={() => onTransition(choice)}
          onKeydown={(event) => onkeydown(event, index)}
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
  </div>
</dialog>

<style>
  dialog {
    width: calc(100% - 40px);
    max-width: 520px;
    max-height: calc(100% - 48px);
    padding: 0;
    overflow: auto;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
    color: var(--gl-ink);
    box-shadow: var(--gl-shadow);
  }
  dialog::backdrop {
    background: var(--gl-backdrop);
  }
  .sheet {
    display: grid;
    gap: 14px;
    padding: 18px;
  }
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
  /* The dialog sits in the top layer, outside the screen's container, so the viewport decides;
     the app fills it, so this matches the screens' 720 px container queries. */
  @media (max-width: 720px) {
    dialog {
      inset: auto 0 0;
      width: auto;
      max-width: none;
      max-height: 85%;
      margin: 0;
      border-width: 1px 0 0;
      border-radius: var(--gl-radius-large) var(--gl-radius-large) 0 0;
    }
    .sheet {
      padding-bottom: calc(18px + env(safe-area-inset-bottom));
    }
  }
</style>
