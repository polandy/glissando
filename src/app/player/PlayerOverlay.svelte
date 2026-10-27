<script lang="ts">
  import { onMount } from "svelte";
  import {
    CAPTION_GLIDE_MS,
    createPlayer,
    type DecodeClipSound,
    type MusicOutput,
    type OpenPicture,
    type PlayerEvent,
    type Slideshow,
  } from "../../player";
  import { getTranslator } from "../i18n/context";
  import Icon from "../components/Icon.svelte";
  import { browserScheduler, type Scheduler } from "../../ui-kit/scheduler";
  import PlayerCaption from "./PlayerCaption.svelte";
  import PlayerCard from "./PlayerCard.svelte";
  import type { PlayerFailure } from "./player-failure";
  import { failureOfPlayerError } from "./player-error";
  import { ControlsVisibility } from "../../ui-kit/controls-visibility";
  import {
    canFullscreen,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
  } from "../../ui-kit/fullscreen";
  import { performPlayerAction, playerActionForKey } from "./player-keys";
  import { slideBoundaries, slideIndexAt } from "./slide-boundaries";
  import { slideCaptionText, slideCaptureDate, slideCardShows } from "./slide-heading";
  import "./player-overlay.css";

  let {
    slideshow,
    musicTitle = null,
    openPicture,
    readVideo,
    musicOutput,
    decodeClipSound,
    startAt = 0,
    picturesAhead,
    pictureFailure = () => "picture",
    onSlide,
    onClose,
    scheduler = browserScheduler,
  }: {
    slideshow: Slideshow;
    /** Shown bottom left while there is music. */
    musicTitle?: string | null;
    /** Reads a slide's picture by its `src`; without it, `src` is a URL. */
    openPicture?: OpenPicture;
    /** Reads a video slide's clip by its `video.src`; without it, `src` is a URL. */
    readVideo?: (src: string) => Promise<Blob>;
    /** Where the music sounds; without it, at the audio element's own volume. */
    musicOutput?: MusicOutput;
    /** Decodes a video clip's sound for Web Audio (ADR-0035); without it, every clip plays silent. */
    decodeClipSound?: DecodeClipSound;
    /** Where on the time line playing starts, in seconds. */
    startAt?: number;
    /** Slides loaded beyond the last one on screen; the player's default without it. */
    picturesAhead?: number;
    /** The card for a picture that failed to load with `cause`; null: the caller handles it. */
    pictureFailure?: (cause: unknown) => PlayerFailure | null;
    /** Told the index of each slide as it comes on screen. */
    onSlide?: (index: number) => void;
    onClose: () => void;
    scheduler?: Scheduler;
  } = $props();

  const STATE_EVENTS: readonly PlayerEvent[] = ["timeupdate", "play", "pause", "seeked", "ended"];
  const SEEK_STEP_SECONDS = 0.1;

  const { t, formatDuration, formatDate } = getTranslator();
  const fullscreenAvailable = canFullscreen();
  const boundaries = $derived(slideBoundaries(slideshow));

  let root: HTMLElement;
  let stage: HTMLElement;
  let bottomBar = $state<HTMLElement>();
  let bottomBarHeight = $state(0);
  let player = $state.raw<ReturnType<typeof createPlayer> | null>(null);
  // svelte-ignore state_referenced_locally
  let currentTime = $state(startAt);
  let paused = $state(true);
  let ended = $state(false);
  /** Until the show moves, it waits for its pictures or clips. */
  let waitingForMedia = $state(true);
  let failure = $state<PlayerFailure | null>(null);
  let controlsVisible = $state(true);
  // The scheduler is fixed for the overlay's lifetime.
  // svelte-ignore state_referenced_locally
  const controls = new ControlsVisibility(scheduler, (visible) => (controlsVisible = visible));

  const slideCount = $derived(boundaries.starts.length);
  const slideNumber = $derived(slideIndexAt(boundaries, currentTime) + 1);
  $effect(() => onSlide?.(slideNumber - 1));
  const currentSlide = $derived(slideshow.slides[slideNumber - 1]);
  const slideHasCard = $derived(slideCardShows(currentSlide));
  const slideDate = $derived(slideCaptureDate(currentSlide));
  const slideCaption = $derived(slideCaptionText(currentSlide));
  const progress = $derived(boundaries.duration > 0 ? currentTime / boundaries.duration : 0);
  const KEY_HINTS = [
    "player.keyPlay",
    "player.keyPrevious",
    "player.keyNext",
    "player.keyClose",
  ] as const;

  onMount(() => {
    const created = createPlayer(stage, slideshow, {
      ...(openPicture === undefined ? {} : { openPicture }),
      ...(readVideo === undefined ? {} : { readVideo }),
      ...(musicOutput === undefined ? {} : { musicOutput }),
      ...(decodeClipSound === undefined ? {} : { decodeClipSound }),
      ...(picturesAhead === undefined ? {} : { picturesAhead }),
    });
    player = created;
    if (startAt > 0) {
      created.currentTime = startAt;
    }
    const sync = () => {
      currentTime = created.currentTime;
      paused = created.paused;
      ended = created.ended;
      controls.setPlaying(!created.paused);
    };
    for (const event of STATE_EVENTS) {
      created.addEventListener(event, sync);
    }
    created.addEventListener("waiting", () => (waitingForMedia = true));
    created.addEventListener("playing", () => (waitingForMedia = false));
    created.addEventListener("error", () => {
      waitingForMedia = false;
      sync();
      failure = failureOfPlayerError(created.error, pictureFailure);
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
      // Within the gesture, also when the music starts only once the pictures are loaded.
      musicOutput?.unlock();
      player.play();
    } else {
      player.pause();
    }
  }

  function onKeydown(event: KeyboardEvent): void {
    const action = playerActionForKey(event);
    if (action !== null) {
      event.preventDefault();
      controls.reveal();
      performPlayerAction(action, {
        boundaries,
        currentTime,
        togglePlay,
        seek,
        close: onClose,
        toggleFullscreen: () => toggleFullscreen(root),
      });
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div
  bind:this={root}
  class="player"
  class:hidden={!controlsVisible}
  style:--player-controls-fade="{CAPTION_GLIDE_MS}ms"
  role="dialog"
  aria-modal="true"
  aria-label={slideshow.title}
  aria-busy={waitingForMedia}
>
  <!-- A tap toggles the controls; the keyboard has its own shortcuts. -->
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div bind:this={stage} class="stage" onclick={() => controls.toggle()}></div>
  <PlayerCaption
    {player}
    caption={slideCaption}
    {controlsVisible}
    {bottomBar}
    {bottomBarHeight}
    {scheduler}
  />

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
        {#if !slideHasCard}
          <span class="name">{slideshow.title}</span>
          {#if slideDate !== undefined}
            <small class="mono">{formatDate(slideDate)}</small>
          {/if}
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
        {#each KEY_HINTS as key (key)}<kbd>{t(key)}</kbd>{/each}
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

  <PlayerCard {failure} {ended} onPlayAgain={togglePlay} {onClose} />
</div>
