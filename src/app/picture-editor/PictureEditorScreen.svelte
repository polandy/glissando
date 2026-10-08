<script lang="ts">
  import { onDestroy } from "svelte";
  import { KEN_BURNS_EASING } from "../../compose";
  import type { OwnKenBurns } from "../../library/own-ken-burns";
  import { framingAt, type Framing } from "../../player";
  import Header from "../components/Header.svelte";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import FrameWell from "./FrameWell.svelte";
  import MotionPanel from "./MotionPanel.svelte";
  import { MotionPreview, type MotionPreviewPorts } from "./motion-preview";
  import { FRAME_KEYS, type FrameKey } from "./frame-keys";
  import type { PictureEditorView } from "./picture-editor-view";

  /**
   * The picture editor: a picture's Ken Burns motion as two frames on the picture, with a
   * preview of what the player will show. Every change goes to `onChange` and is stored at once.
   */
  let {
    picture,
    pictureUrl,
    slideshowTitle,
    onBack,
    onOpen,
    onChange,
    onSwap,
    onReset,
    previewPorts,
    reducedMotion,
    saving,
  }: {
    picture: PictureEditorView;
    /** The display rendition's object URL; null while it loads. */
    pictureUrl: string | null;
    slideshowTitle: string;
    onBack: () => void;
    /** Opens another picture of the slideshow in the editor. */
    onOpen: (pictureId: string) => void;
    onChange: (motion: OwnKenBurns) => void;
    onSwap: () => void;
    onReset: () => void;
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

  // The screen is keyed by picture: duration and the start state are fixed for its lifetime.
  // svelte-ignore state_referenced_locally
  const preview = new MotionPreview(
    { durationMs: picture.durationMs, playing: !reducedMotion },
    previewPorts,
  );
  let previewState = $state.raw(preview.state);
  preview.subscribe((state) => (previewState = state));
  onDestroy(() => preview.dispose());

  const previewFraming = $derived(
    framingAt({ ...motion, easing: KEN_BURNS_EASING }, previewState.progress),
  );

  /** Editing a frame shows its end in the preview: the start at 0, the end at 1. */
  function holdOn(key: FrameKey): void {
    preview.holdAt(key === "from" ? 0 : 1);
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
      preview.holdAt(0);
    } else {
      preview.restart();
    }
  }

  function openNeighbour(pictureId: string | null): void {
    if (pictureId !== null) {
      onOpen(pictureId);
    }
  }
</script>

<div class="screen" aria-busy={saving}>
  <Header
    crumbs={[t("start.library"), slideshowTitle, t("editor.crumb", { number: picture.number })]}
    {onBack}
  >
    {#snippet actions()}
      <button
        class="icon-btn"
        type="button"
        aria-label={t("editor.previous")}
        title={t("editor.previous")}
        aria-disabled={picture.previousId === null}
        onclick={() => openNeighbour(picture.previousId)}
      >
        <Icon name="chevronLeft" />
      </button>
      <span class="counter mono muted">
        {t("editor.counter", { number: picture.number, count: picture.count })}
      </span>
      <button
        class="icon-btn"
        type="button"
        aria-label={t("editor.next")}
        title={t("editor.next")}
        aria-disabled={picture.nextId === null}
        onclick={() => openNeighbour(picture.nextId)}
      >
        <Icon name="chevronRight" />
      </button>
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
        onActivate={activate}
        onFraming={frameChanged}
      />
      <p class="hint wide-hint">{t("editor.hintWide")}</p>
    </div>
    <MotionPanel
      {picture}
      {pictureUrl}
      {motion}
      {active}
      {previewState}
      {previewFraming}
      onActivate={activate}
      onPlay={() => preview.play()}
      onPause={() => preview.pause()}
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
    />
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
    grid-template-rows: minmax(0, 1fr) auto;
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
  .counter {
    font-size: var(--gl-size-meta);
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
    .wide-hint,
    .counter {
      display: none;
    }
  }
</style>
