<script lang="ts">
  import { onDestroy } from "svelte";
  import { KEN_BURNS_EASING, transitionDurationMs } from "../../compose";
  import type { OwnKenBurns } from "../../library/own-ken-burns";
  import type { TransitionChoice } from "../../library/own-timing";
  import { framingAt, normalizeCaption, type Framing } from "../../player";
  import Header from "../components/Header.svelte";
  import { getTranslator } from "../i18n/context";
  import FocusLine from "./FocusLine.svelte";
  import { focusIndication } from "./focus-indication";
  import FrameWell from "./FrameWell.svelte";
  import DurationSection from "./DurationSection.svelte";
  import MotionPanel from "./MotionPanel.svelte";
  import MotionPreviewScreen from "./MotionPreviewScreen.svelte";
  import PictureNavigation from "./PictureNavigation.svelte";
  import TransitionSection from "./TransitionSection.svelte";
  import { MotionPreview, type MotionPreviewPorts } from "./motion-preview";
  import { previewPlan, transitionHoldMs, transitionLeadInMs } from "./timing/preview-timeline";
  import { FRAME_KEYS, type FrameKey } from "./frame-keys";
  import type { PictureEditorView } from "./picture-editor-view";

  /**
   * The picture editor: a picture's Ken Burns motion as two frames on the picture, with a
   * preview of what the player will show, its caption, duration and transition into the next
   * picture. Every change goes to its callback and is stored at once.
   */
  let {
    picture,
    pictureUrl,
    nextPictureUrl,
    slideshowTitle,
    onBack,
    onOpen,
    onChange,
    onSwap,
    onReset,
    onCaption,
    onDuration,
    onResetDuration,
    onTransition,
    onResetTransition,
    previewPorts,
    reducedMotion,
    saving,
  }: {
    picture: PictureEditorView;
    /** The display rendition's object URL; null while it loads. */
    pictureUrl: string | null;
    /** The next picture's, for the transition; null while it loads and at the last picture. */
    nextPictureUrl: string | null;
    slideshowTitle: string;
    onBack: () => void;
    /** Opens another picture of the slideshow in the editor. */
    onOpen: (pictureId: string) => void;
    onChange: (motion: OwnKenBurns) => void;
    onSwap: () => void;
    onReset: () => void;
    /** The caption as typed, on every keystroke. */
    onCaption: (typed: string) => void;
    /** An own duration in whole milliseconds. */
    onDuration: (durationMs: number) => void;
    onResetDuration: () => void;
    onTransition: (choice: TransitionChoice) => void;
    onResetTransition: () => void;
    previewPorts: MotionPreviewPorts;
    /** The preview starts paused. */
    reducedMotion: boolean;
    /** An edit is being stored. */
    saving: boolean;
  } = $props();

  const { t } = getTranslator();

  let active = $state<FrameKey>(FRAME_KEYS[0]);
  /** The motion while a drag is under way; stored on release. */
  let draft = $state.raw<OwnKenBurns | null>(null);
  const motion = $derived(draft ?? picture.motion);
  const focus = $derived(focusIndication(picture.focus, picture.ownMotion));
  // Typed text stays as typed while the stored caption is its normalised form.
  // svelte-ignore state_referenced_locally
  let caption = $state(picture.caption);

  // The screen is keyed by picture: the start state is fixed for its lifetime.
  // svelte-ignore state_referenced_locally
  const previewClock = new MotionPreview(
    { durationMs: picture.durationMs, playing: !reducedMotion },
    previewPorts,
  );
  let previewState = $state.raw(previewClock.state);
  previewClock.subscribe((state) => (previewState = state));
  onDestroy(() => previewClock.dispose());

  // svelte-ignore state_referenced_locally
  let previewedDurationMs = picture.durationMs;
  /** A new duration plays from the start. */
  $effect(() => {
    if (picture.durationMs !== previewedDurationMs) {
      previewedDurationMs = picture.durationMs;
      previewClock.retime(picture.durationMs);
      replay();
    }
  });

  const previewFraming = $derived(
    framingAt(
      { ...motion, easing: KEN_BURNS_EASING },
      Math.min(1, previewState.elapsedMs / picture.durationMs),
    ),
  );

  /** Editing a frame shows its end in the preview: the start at 0, the end at 1. */
  function holdOn(key: FrameKey): void {
    previewClock.holdAt(key === "from" ? 0 : 1);
  }

  function activate(key: FrameKey): void {
    active = key;
    holdOn(key);
  }

  function frameChanged(key: FrameKey, framing: Framing, final: boolean): void {
    const changed = { ...motion, [key]: framing };
    holdOn(key);
    if (final) {
      draft = null;
      onChange(changed);
    } else {
      draft = changed;
    }
  }

  /** After a swap or a reset the whole new motion plays, unless motion is reduced. */
  function replay(): void {
    if (reducedMotion) {
      previewClock.holdAt(0);
    } else {
      previewClock.restart();
    }
  }

  /**
   * A transition picked (or reset) plays from a moment before it, or rests half-way through.
   * Built from `choice` explicitly, not the picture prop: right after `onTransition` fires, it
   * may not carry the new transition yet.
   */
  function showTransition(choice: TransitionChoice): void {
    const plan = previewPlan({
      durationMs: picture.durationMs,
      transition: { choice, durationMs: transitionDurationMs(picture.durationMs) },
      next: picture.next,
    });
    if (reducedMotion) {
      previewClock.restAt(transitionHoldMs(plan));
    } else {
      previewClock.playFrom(transitionLeadInMs(plan));
    }
  }
</script>

<div class="screen" aria-busy={saving}>
  <Header
    crumbs={[t("start.library"), slideshowTitle, t("editor.crumb", { number: picture.number })]}
    {onBack}
  >
    {#snippet actions()}
      <PictureNavigation {picture} {onOpen} />
    {/snippet}
  </Header>
  <main class="edit">
    <div class="well-column">
      <FrameWell
        size={picture.size}
        {pictureUrl}
        alt={t("editor.crumb", { number: picture.number })}
        {motion}
        {active}
        playhead={previewState.playing ? previewFraming : null}
        focusMarker={focus.kind === "marker" ? focus : null}
        {reducedMotion}
        onActivate={activate}
        onFraming={frameChanged}
      />
      <FocusLine indication={focus} />
      <p class="hint wide-hint">{t("editor.hintWide")}</p>
    </div>
    <MotionPanel
      {picture}
      {motion}
      {active}
      onActivate={activate}
      onSwap={() => {
        onSwap();
        replay();
      }}
      onReset={() => {
        if (picture.ownMotion) {
          onReset();
          replay();
        }
      }}
      bind:caption
      {onCaption}
    >
      {#snippet preview()}
        <MotionPreviewScreen
          {picture}
          {motion}
          {pictureUrl}
          {nextPictureUrl}
          caption={normalizeCaption(caption)}
          playback={previewState}
          onPlay={() => previewClock.play()}
          onPause={() => previewClock.pause()}
        />
      {/snippet}
      {#snippet timing()}
        <DurationSection {picture} {onDuration} onReset={onResetDuration} />
        <TransitionSection
          {picture}
          {pictureUrl}
          {nextPictureUrl}
          ports={previewPorts}
          {reducedMotion}
          onTransition={(choice) => {
            onTransition(choice);
            showTransition(choice);
          }}
          onReset={() => {
            onResetTransition();
            showTransition(picture.transition.automatic);
          }}
        />
      {/snippet}
    </MotionPanel>
  </main>
</div>

<style>
  /* A zero basis: the screen keeps the viewport's height and the panel scrolls inside it. */
  .edit {
    flex: 1 1 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    min-height: 0;
  }
  .well-column {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto auto;
    gap: 10px;
    min-height: 0;
    padding: 18px;
  }
  .hint {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
    text-align: center;
  }
  @container (max-width: 720px) {
    /* The phone layout scrolls as one: the picture on top, the panel below. */
    .edit {
      flex: none;
      grid-template-columns: 1fr;
    }
    .well-column {
      padding: 0;
    }
    .wide-hint {
      display: none;
    }
  }
</style>
