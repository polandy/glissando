<script lang="ts">
  import { onMount } from "svelte";
  import {
    createPlayer,
    MusicPlaybackError,
    SlideshowLoadError,
    type OpenPicture,
    type PlayerEvent,
    type Slideshow,
  } from "../../player";
  import { getTranslator } from "../i18n/context";
  import { ICONS } from "../icons";
  import { browserScheduler, type Scheduler } from "../scheduler";
  import { ControlsVisibility } from "./controls-visibility";
  import { enterFullscreen, exitFullscreen, toggleFullscreen } from "./fullscreen";
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
    openPicture,
    onClose,
    scheduler = browserScheduler,
  }: {
    slideshow: Slideshow;
    /** Shown bottom left while there is music. */
    musicTitle?: string | null;
    /** Reads a slide's picture by its `src`; without it, `src` is a URL. */
    openPicture?: OpenPicture;
    onClose: () => void;
    scheduler?: Scheduler;
  } = $props();

  type Failure = "picture" | "playback";

  const STATE_EVENTS: readonly PlayerEvent[] = ["timeupdate", "play", "pause", "seeked", "ended"];
  const SEEK_STEP_SECONDS = 0.1;

  const { t, formatDuration } = getTranslator();
  const boundaries = $derived(slideBoundaries(slideshow));

  let root: HTMLElement;
  let stage: HTMLElement;
  let player: ReturnType<typeof createPlayer> | null = null;
  let currentTime = $state(0);
  let paused = $state(true);
  let ended = $state(false);
  let failure = $state<Failure | null>(null);
  let controlsVisible = $state(true);
  // The scheduler is fixed for the overlay's lifetime.
  // svelte-ignore state_referenced_locally
  const controls = new ControlsVisibility(scheduler, (visible) => (controlsVisible = visible));

  const slideCount = $derived(boundaries.starts.length);
  const slideNumber = $derived(slideIndexAt(boundaries, currentTime) + 1);

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

  <div class="ui" inert={!controlsVisible}>
    <div class="top" role="group" onpointerdown={() => controls.reveal()}>
      <button
        class="round"
        type="button"
        title={t("player.close")}
        aria-label={t("player.close")}
        onclick={onClose}
      >
        {ICONS.close}
      </button>
      <span class="counter">{t("player.counter", { index: slideNumber, total: slideCount })}</span>
    </div>
    {#if musicTitle !== null}
      <div class="music">{ICONS.music} {t("player.music", { track: musicTitle })}</div>
    {/if}
    <div class="hint">{t("player.hint")}</div>
    <div class="bottom" role="group" onpointerdown={() => controls.reveal()}>
      <button
        class="play"
        type="button"
        aria-label={paused ? t("player.play") : t("player.pause")}
        onclick={togglePlay}
      >
        {paused ? ICONS.play : ICONS.pause}
      </button>
      <div class="seek">
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
        <div class="ticks" aria-hidden="true">
          {#each boundaries.starts as start (start)}
            <i style:left="{(start / boundaries.duration) * 100}%"></i>
          {/each}
        </div>
        <div class="time">
          {t("player.time", {
            current: formatDuration(currentTime),
            total: formatDuration(boundaries.duration),
          })}
        </div>
      </div>
    </div>
  </div>

  {#if failure !== null}
    <div class="card-layer" role="alert">
      <div class="box">
        <p>{failure === "picture" ? t("player.pictureError") : t("player.playbackError")}</p>
        <button class="btn" type="button" onclick={onClose}>{t("common.close")}</button>
      </div>
    </div>
  {:else if ended}
    <div class="card-layer">
      <div class="box">
        <h2>{t("player.end")}</h2>
        <div class="row">
          <button class="btn primary" type="button" onclick={togglePlay}>
            <span aria-hidden="true">{ICONS.replay}</span>{t("player.again")}
          </button>
          <button class="btn" type="button" onclick={onClose}>{t("common.close")}</button>
        </div>
      </div>
    </div>
  {/if}
</div>
