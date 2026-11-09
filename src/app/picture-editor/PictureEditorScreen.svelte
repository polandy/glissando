<script lang="ts">
  import { onDestroy } from "svelte";
  import { KEN_BURNS_EASING } from "../../compose";
  import type { OwnKenBurns } from "../../library/own-ken-burns";
  import type { TransitionChoice } from "../../library/own-timing";
  import { normalizeCaption, type Framing } from "../../player";
  import Header from "../components/Header.svelte";
  import { getTranslator } from "../i18n/context";
  import { focusIndication } from "./focus-indication";
  import { playheadRect } from "./frame-geometry";
  import MotionPanel from "./MotionPanel.svelte";
  import MotionPreviewScreen from "./MotionPreviewScreen.svelte";
  import PictureNavigation from "./PictureNavigation.svelte";
  import PictureEditorTiming from "./PictureEditorTiming.svelte";
  import PictureEditorWell from "./PictureEditorWell.svelte";
  import ViewSwitch, { type PhoneView } from "./ViewSwitch.svelte";
  import { EditorPreviewSession } from "./editor-preview-session.svelte";
  import type { MotionPreviewPorts } from "./motion-preview";
  import { FRAME_KEYS, type FrameKey } from "./frame-keys";
  import { WHEEL_REST_MS, type FramingStep } from "./framing-step";
  import type { Scheduler } from "../../ui-kit/scheduler";
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
    onPlayFrom,
    onChange,
    onSwap,
    onReset,
    onCaption,
    onClearCaption,
    onDuration,
    onTransition,
    onResetTiming,
    onAlone,
    onLookAgain,
    previewPorts,
    scheduler,
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
    /** Plays the slideshow from this picture. */
    onPlayFrom: (pictureId: string) => void;
    /** Carries the screen's own picture: a waiting wheel zoom is stored on leaving, when the
     * route may already show the next picture. */
    onChange: (pictureId: string, motion: OwnKenBurns) => void;
    onSwap: () => void;
    onReset: () => void;
    /** The caption as typed, on every keystroke. */
    onCaption: (typed: string) => void;
    /** The caption's clear button was pressed; its undo is offered by the caller. */
    onClearCaption: () => void;
    /** A chosen duration in whole milliseconds. */
    onDuration: (durationMs: number) => void;
    onTransition: (choice: TransitionChoice) => void;
    /** Duration and transition back to automatic, together. */
    onResetTiming: () => void;
    /** "Always alone" was toggled (ADR-0028). */
    onAlone: (alone: boolean) => void;
    /** Looks at this picture's focus again; never touches its Ken Burns motion (ADR-0041). */
    onLookAgain: () => void;
    previewPorts: MotionPreviewPorts;
    /** Times the wheel's rest before its zoom is stored. */
    scheduler: Scheduler;
    /** The preview starts paused. */
    reducedMotion: boolean;
    /** An edit is being stored. */
    saving: boolean;
  } = $props();

  const { t } = getTranslator();

  let active = $state<FrameKey>(FRAME_KEYS[0]);
  let phoneView = $state<PhoneView>("frame");
  // The screen is keyed by picture: its id is fixed for its lifetime.
  // svelte-ignore state_referenced_locally
  const pictureId = picture.id;
  /** The motion while a drag or a wheel zoom is under way; stored when it ends. */
  let draft = $state.raw<OwnKenBurns | null>(null);
  const motion = $derived(draft ?? picture.motion);
  const focus = $derived(focusIndication(picture.focus, picture.ownMotion));
  // Typed text stays as typed while the stored caption is its normalised form.
  // svelte-ignore state_referenced_locally
  let caption = $state(picture.caption);

  // The screen is keyed by picture: the start state is fixed for its lifetime.
  // svelte-ignore state_referenced_locally
  const previewSession = new EditorPreviewSession(picture.durationMs, reducedMotion, previewPorts);
  const previewClock = previewSession.clock;
  const editorPreview = previewSession.answers;
  onDestroy(() => previewSession.dispose());
  $effect(() => previewSession.retimeTo(picture.durationMs));

  const previewPlayhead = $derived(
    playheadRect(
      {
        kenBurns: { ...motion, easing: KEN_BURNS_EASING },
        progress: Math.min(1, previewSession.state.elapsedMs / picture.durationMs),
      },
      picture.size,
    ),
  );

  function activate(key: FrameKey): void {
    active = key;
    phoneView = "frame";
    editorPreview.showFrame(key);
  }

  /** Shows the preview in place of the picture on a phone, where it plays the change. */
  function showPreview(): void {
    phoneView = "play";
  }

  function switchView(view: PhoneView): void {
    if (view === "frame") {
      activate(active);
    } else {
      showPreview();
      editorPreview.replay();
    }
  }

  let cancelWheelRest = (): void => {};

  function store(changed: OwnKenBurns): void {
    cancelWheelRest();
    draft = null;
    onChange(pictureId, changed);
  }

  /** Stores what a wheel zoom or a drag left waiting, before another edit or on leaving. */
  function storeDraft(): void {
    if (draft !== null) {
      store(draft);
    }
  }
  onDestroy(storeDraft);

  function frameChanged(key: FrameKey, framing: Framing, step: FramingStep): void {
    const changed = { ...motion, [key]: framing };
    editorPreview.showFrame(key);
    if (step === "done") {
      store(changed);
      return;
    }
    draft = changed;
    // A drag takes over a zoom the wheel left waiting and stores it with its own release.
    cancelWheelRest();
    if (step === "wheeling") {
      cancelWheelRest = scheduler.after(WHEEL_REST_MS, storeDraft);
    }
  }
</script>

<div class="screen" data-testid="editing-screen" aria-busy={saving}>
  <Header
    crumbs={[t("start.library"), slideshowTitle, t("editor.crumb", { number: picture.number })]}
    {onBack}
  >
    {#snippet actions()}
      <PictureNavigation {picture} {onOpen} {onPlayFrom} />
    {/snippet}
  </Header>
  <main class="edit">
    <PictureEditorWell
      size={picture.size}
      {pictureUrl}
      alt={t("editor.crumb", { number: picture.number })}
      {motion}
      {active}
      playhead={previewSession.state.playing ? previewPlayhead : null}
      {focus}
      {reducedMotion}
      {phoneView}
      onActivate={activate}
      onFraming={frameChanged}
      onView={switchView}
    />
    <MotionPanel
      {picture}
      {active}
      previewOnPhone={phoneView === "play"}
      onActivate={activate}
      onSwap={() => {
        storeDraft();
        onSwap();
        showPreview();
        editorPreview.replay();
      }}
      onReset={() => {
        if (picture.ownMotion) {
          storeDraft();
          onReset();
          showPreview();
          editorPreview.replay();
        }
      }}
      {onLookAgain}
      bind:caption
      {onCaption}
      {onClearCaption}
    >
      {#snippet preview()}
        <MotionPreviewScreen
          {picture}
          {motion}
          {pictureUrl}
          {nextPictureUrl}
          caption={normalizeCaption(caption)}
          playback={previewSession.state}
          onPlay={() => previewClock.play()}
          onPause={() => previewClock.pause()}
        />
        <ViewSwitch view={phoneView} onView={switchView} />
      {/snippet}
      {#snippet timing()}
        <PictureEditorTiming
          {picture}
          {pictureUrl}
          {nextPictureUrl}
          {previewPorts}
          {reducedMotion}
          {editorPreview}
          {showPreview}
          {onDuration}
          {onTransition}
          {onResetTiming}
          {onAlone}
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
  @container (max-width: 720px) {
    /* The phone layout scrolls as one: the picture on top, the panel below. */
    .edit {
      flex: none;
      grid-template-columns: 1fr;
    }
  }
</style>
