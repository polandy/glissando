<script lang="ts">
  import { onMount } from "svelte";
  import { MediaQuery } from "svelte/reactivity";
  import {
    createPlayer,
    MusicPlaybackError,
    SlideshowLoadError,
    type OpenPicture,
    type PlayerEvent,
    type Slideshow,
  } from "../../player";
  import { getTranslator } from "../i18n/context";
  import Icon from "../components/Icon.svelte";
  import { REDUCED_MOTION_QUERY } from "../reduced-motion";
  import { browserScheduler, type Scheduler } from "../scheduler";
  import { captionInset, captionInsetMotion } from "./caption-inset";
  import { ControlsVisibility } from "./controls-visibility";
  import { canFullscreen, enterFullscreen, exitFullscreen, toggleFullscreen } from "./fullscreen";
  import { playerActionForKey, type PlayerAction } from "./player-keys";
  import {
    nextSlideStart,
    previousSlideStart,
    slideBoundaries,
    slideIndexAt,
  } from "./slide-boundaries";
  import "./player-overlay.css";

  let {
    slideshow,
    musicTitle = null,
    slideDates = [],
    openPicture,
    onClose,
    scheduler = browserScheduler,
  }: {
    slideshow: Slideshow;
    /** Shown bottom left while there is music. */
    musicTitle?: string | null;
    /** Each slide's capture date (ISO 8601), shown under the title; empty shows none. */
    slideDates?: readonly string[];
    /** Reads a slide's picture by its `src`; without it, `src` is a URL. */
    openPicture?: OpenPicture;
    onClose: () => void;
    scheduler?: Scheduler;
  } = $props();

  type Failure = "picture" | "playback";

  const STATE_EVENTS: readonly PlayerEvent[] = ["timeupdate", "play", "pause", "seeked", "ended"];
  const SEEK_STEP_SECONDS = 0.1;

  const { t, formatDuration, formatDate } = getTranslator();
  const fullscreenAvailable = canFullscreen();
  const boundaries = $derived(slideBoundaries(slideshow));

  let root: HTMLElement;
  let stage: HTMLElement;
  let bottomBar: HTMLElement;
  let bottomBarHeight = $state(0);
  let player = $state.raw<ReturnType<typeof createPlayer> | null>(null);
  let currentTime = $state(0);
  let paused = $state(true);
  let ended = $state(false);
  let failure = $state<Failure | null>(null);
  let controlsVisible = $state(true);
  const reducedMotion = new MediaQuery(REDUCED_MOTION_QUERY);
  /** The player whose caption inset is placed; a new player gets its first inset at once. */
  let insetPlayer: ReturnType<typeof createPlayer> | null = null;
  // The scheduler is fixed for the overlay's lifetime.
  // svelte-ignore state_referenced_locally
  const controls = new ControlsVisibility(scheduler, (visible) => (controlsVisible = visible));

  const slideCount = $derived(boundaries.starts.length);
  const slideNumber = $derived(slideIndexAt(boundaries, currentTime) + 1);
  const slideDate = $derived(slideDates[slideNumber - 1]);
  const slideCaption = $derived(slideshow.slides[slideNumber - 1]?.caption ?? "");
  const progress = $derived(boundaries.duration > 0 ? currentTime / boundaries.duration : 0);
  const KEY_HINTS = [
    "player.keyPlay",
    "player.keyPrevious",
    "player.keyNext",
    "player.keyClose",
  ] as const;

  onMount(() => {
    const created = createPlayer(
      stage,
      slideshow,
      openPicture === undefined ? {} : { openPicture },
    );
    player = created;
    const sync = () => {
      currentTime = created.currentTime;
      paused = created.paused;
      ended = created.ended;
      controls.setPlaying(!created.paused);
    };
    for (const event of STATE_EVENTS) {
      created.addEventListener(event, sync);
    }
    created.addEventListener("error", () => {
      sync();
      failure = failureOf(created.error);
    });
    created.play();
    enterFullscreen(root);
    return () => {
      controls.dispose();
      created.destroy();
      player = null;
      exitFullscreen();
    };
  });

  // Captions glide up above the bottom controls while they show.
  $effect(() => {
    if (player === null) {
      return;
    }
    const inset = captionInset(controlsVisible, {
      height: bottomBarHeight,
      fadeHeight: parseFloat(getComputedStyle(bottomBar).paddingTop),
    });
    const motion = captionInsetMotion({
      firstPlacement: player !== insetPlayer,
      reducedMotion: reducedMotion.current,
    });
    insetPlayer = player;
    if (motion === "jump") {
      player.jumpCaptionInset(inset);
    } else {
      player.captionInset = inset;
    }
  });

  /** A refused music start is no failure: the player pauses, and play retries with a gesture. */
  function failureOf(error: Error | null): Failure | null {
    if (error instanceof MusicPlaybackError) {
      return null;
    }
    if (error instanceof SlideshowLoadError) {
      return "picture";
    }
    console.error("the player failed", error);
    return "playback";
  }

  function seek(seconds: number): void {
    if (player !== null) {
      currentTime = seconds;
      player.currentTime = seconds;
    }
  }

  function togglePlay(): void {
    if (player === null) {
      return;
    }
    if (player.paused) {
      failure = null;
      player.play();
    } else {
      player.pause();
    }
  }

  function perform(action: PlayerAction): void {
    switch (action) {
      case "toggle-play":
        return togglePlay();
      case "previous":
        return seek(previousSlideStart(boundaries, currentTime));
      case "next": {
        const start = nextSlideStart(boundaries, currentTime);
        return start === null ? undefined : seek(start);
      }
      case "close":
        return onClose();
      case "toggle-fullscreen":
        return toggleFullscreen(root);
    }
  }

  function onKeydown(event: KeyboardEvent): void {
    const action = playerActionForKey(event);
    if (action !== null) {
      event.preventDefault();
      controls.reveal();
      perform(action);
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div
  bind:this={root}
  class="player"
  class:hidden={!controlsVisible}
  role="dialog"
  aria-modal="true"
  aria-label={slideshow.title}
>
  <!-- A tap toggles the controls; the keyboard has its own shortcuts. -->
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div bind:this={stage} class="stage" onclick={() => controls.toggle()}></div>
  <!-- The caption is drawn into the picture; screen readers hear it from here. -->
  <p class="caption-text" aria-live="polite">{slideCaption}</p>

  <div class="ui" inert={!controlsVisible}>
    <div class="top" role="group" onpointerdown={() => controls.reveal()}>
      <button
        class="glass"
        type="button"
        title={t("player.close")}
        aria-label={t("player.close")}
        onclick={onClose}
      >
        <Icon name="close" />
      </button>
      <div class="heading">
        <span class="name">{slideshow.title}</span>
        {#if slideDate !== undefined}
          <small class="mono">{formatDate(slideDate)}</small>
        {/if}
      </div>
      <span class="counter mono"
        >{t("player.counter", { index: slideNumber, total: slideCount })}</span
      >
      {#if fullscreenAvailable}
        <button
          class="glass"
          type="button"
          title={t("player.fullscreen")}
          aria-label={t("player.fullscreen")}
          onclick={() => toggleFullscreen(root)}
        >
          <Icon name="expand" />
        </button>
      {/if}
    </div>
    <div
      bind:this={bottomBar}
      bind:offsetHeight={bottomBarHeight}
      class="bottom"
      role="group"
      onpointerdown={() => controls.reveal()}
    >
      <div class="hint" role="note" aria-label={t("player.hint")}>
        {#each KEY_HINTS as key (key)}<kbd class="mono">{t(key)}</kbd>{/each}
      </div>
      <div class="scrub">
        <div class="rail" aria-hidden="true">
          <i class="done" style:width="{progress * 100}%"></i>
          {#each boundaries.starts as start (start)}
            {#if start > 0}<i class="tick" style:left="{(start / boundaries.duration) * 100}%"
              ></i>{/if}
          {/each}
        </div>
        <input
          type="range"
          min="0"
          max={boundaries.duration}
          step={SEEK_STEP_SECONDS}
          value={currentTime}
          aria-label={t("player.seek")}
          aria-valuetext={formatDuration(currentTime)}
          oninput={(event) => seek(event.currentTarget.valueAsNumber)}
        />
      </div>
      <div class="row">
        <button
          class="play"
          type="button"
          aria-label={paused ? t("player.play") : t("player.pause")}
          onclick={togglePlay}
        >
          <Icon name={paused ? "play" : "pause"} />
        </button>
        <span class="time mono">
          {t("player.time", {
            current: formatDuration(currentTime),
            total: formatDuration(boundaries.duration),
          })}
        </span>
        {#if musicTitle !== null}
          <span class="music"><Icon name="music" />{t("player.music", { track: musicTitle })}</span>
        {/if}
      </div>
    </div>
  </div>

  {#if failure !== null}
    <div class="card-layer" role="alert">
      <div class="box">
        <p>{failure === "picture" ? t("player.pictureError") : t("player.playbackError")}</p>
        <button class="pill" type="button" onclick={onClose}>{t("common.close")}</button>
      </div>
    </div>
  {:else if ended}
    <div class="card-layer">
      <div class="box">
        <h2>{t("player.end")}</h2>
        <div class="row">
          <button class="pill light" type="button" onclick={togglePlay}>
            <Icon name="replay" />{t("player.again")}
          </button>
          <button class="pill" type="button" onclick={onClose}>{t("common.close")}</button>
        </div>
      </div>
    </div>
  {/if}
</div>
