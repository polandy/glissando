<script lang="ts">
  import { onDestroy } from "svelte";
  import { MAX_TRANSITION_DURATION_MS, TRANSITION_SHARE_OF_SLIDE } from "../../compose";
  import {
    ALTERNATE_TRANSITION,
    CUT_TRANSITION,
    TRANSITION_CHOICES,
    type TransitionChoice,
  } from "../../library/own-timing";
  import { MILLISECONDS_PER_SECOND } from "../../player";
  import { radioIndexForKey } from "../components/radio-keys";
  import { getTranslator } from "../i18n/context";
  import type { MotionPreviewPorts } from "./motion-preview";
  import type { PictureEditorView } from "./picture-editor-view";
  import { FrameTicker } from "./timing/frame-ticker";
  import { TILE_STILL_MS } from "./timing/preview-timeline";
  import TransitionTile from "./TransitionTile.svelte";

  /**
   * How the picture hands over to the next: automatic until a tile is picked. The last picture
   * has none; an own one stored there stays, and applies again once a picture follows. Its
   * reset belongs to the timing section around it.
   */
  let {
    picture,
    pictureUrl,
    nextPictureUrl,
    ports,
    reducedMotion,
    onTransition,
  }: {
    picture: PictureEditorView;
    pictureUrl: string | null;
    nextPictureUrl: string | null;
    /** The tiles' loop runs on these. */
    ports: MotionPreviewPorts;
    /** The tiles stand still half-way through their effect. */
    reducedMotion: boolean;
    onTransition: (choice: TransitionChoice) => void;
  } = $props();

  const { t, formatTenthSeconds } = getTranslator();
  const PERCENT = 100;

  let elapsedMs = $state(TILE_STILL_MS);
  // The ports and the motion preference are fixed for the screen's lifetime.
  // svelte-ignore state_referenced_locally
  const ticker =
    reducedMotion || picture.next === null
      ? null
      : new FrameTicker(ports, (elapsed) => (elapsedMs = elapsed));
  onDestroy(() => ticker?.stop());

  const radios: HTMLButtonElement[] = $state([]);
  const own = $derived(picture.transition.own);
  const hint = $derived(
    picture.transition.choice === CUT_TRANSITION
      ? t("editor.cutHint", { number: picture.number + 1 })
      : t("editor.transitionHint", {
          length: formatTenthSeconds(picture.transition.durationMs / MILLISECONDS_PER_SECOND),
          number: picture.number,
          share: TRANSITION_SHARE_OF_SLIDE * PERCENT,
          max: MAX_TRANSITION_DURATION_MS / MILLISECONDS_PER_SECOND,
        }),
  );

  const automaticHint = $derived(
    picture.transition.slideshowTransition === ALTERNATE_TRANSITION
      ? t("editor.transitionsAlternate")
      : t("editor.transitionFollowsSlideshow", {
          effect: t(`effect.${picture.transition.slideshowTransition}`),
        }),
  );

  // Selection follows focus, as in the WAI-ARIA radio group: one tab stop, arrows choose.
  function onkeydown(event: KeyboardEvent, index: number): void {
    const next = radioIndexForKey(event.key, index, TRANSITION_CHOICES.length);
    const choice = next === null ? undefined : TRANSITION_CHOICES[next];
    if (next === null || choice === undefined) {
      return;
    }
    event.preventDefault();
    onTransition(choice);
    radios[next]?.focus();
  }
</script>

<div class="transition">
  {#if picture.next === null}
    <h3 class="sub">{t("editor.lastPicture")}</h3>
    <div class="note">
      <span><b>{t("editor.endsHere")}</b>{t("editor.endsHereRest")}</span>
      {#if own}
        <span class="muted">
          {t("editor.storedTransitionStays", { effect: t(`effect.${picture.transition.choice}`) })}
        </span>
      {/if}
    </div>
  {:else}
    <h3 class="sub" id="transition-label">
      {t("editor.transitionTo", { number: picture.number + 1 })}
    </h3>
    <div class="tiles" role="radiogroup" aria-labelledby="transition-label">
      {#each TRANSITION_CHOICES as choice, index (choice)}
        <TransitionTile
          bind:radio={radios[index]}
          {choice}
          checked={choice === picture.transition.choice}
          automatic={!own}
          tag={!own && choice === picture.transition.automatic ? t("editor.autoTag") : null}
          {pictureUrl}
          {nextPictureUrl}
          {elapsedMs}
          onPick={() => onTransition(choice)}
          onKeydown={(event) => onkeydown(event, index)}
        />
      {/each}
    </div>
    <p class="hint">
      {#if !own}{automaticHint}{/if}
      {hint}
    </p>
  {/if}
</div>

<style>
  .transition {
    display: grid;
    gap: 12px;
  }
  .sub {
    margin: 0;
    font-size: var(--gl-size-label);
    font-weight: var(--gl-weight-semibold);
  }
  .tiles {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  .hint {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
  .note {
    display: grid;
    gap: 4px;
    padding: 10px 12px;
    border-radius: var(--gl-radius);
    background: var(--gl-hover);
    font-size: var(--gl-size-meta);
    line-height: 1.45;
  }
  .note b {
    font-weight: var(--gl-weight-semibold);
  }
</style>
