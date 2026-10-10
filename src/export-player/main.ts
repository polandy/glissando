// The exported page's script (dev-docs/HTML_EXPORT.md): reads the page's data blocks, plays the
// slideshow with Glissando's own engine, and runs the start card, controls and end card. Built
// into one self-contained script by build/export-player-plugin.ts; never imports Svelte.
import { captionInset, captionInsetMotion } from "../ui-kit/caption-inset";
import { ControlsVisibility } from "../ui-kit/controls-visibility";
import { canFullscreen, toggleFullscreen } from "../ui-kit/fullscreen";
import { REDUCED_MOTION_QUERY } from "../ui-kit/reduced-motion";
import { browserScheduler } from "../ui-kit/scheduler";
import { MEDIA_TYPE_ATTRIBUTE, PAGE_STATE_ATTRIBUTE } from "../html-export/page-contract";
import { createBrowserPlayer, type BrowserPlayer } from "../player/browser-player";
import { createMusicAudioContext } from "../player/browser/platform";
import DecodeWorker from "../player/browser/picture-decode-worker.ts?worker&inline";
import { CAPTION_FONT_FAMILY, CAPTION_FONT_WEIGHT } from "../player/caption-layout";
import { MusicPlaybackError } from "../player/ports";
import type { Slideshow } from "../player/slideshow";
import { MutableMusicOutput } from "./mutable-music-output";
import { pageKeyAction, timelineKeyAction, type PageAction } from "./page-keys";
import { readPageData, type PageBlock } from "./page-data";
import { createPageView, type PageView } from "./page-view";
import { SEEK_STEP_SECONDS, seekBy, timelineSeconds } from "./seek";
import "./page.css";

/** Any size: `document.fonts.load` only needs a font shorthand. */
const FONT_PROBE_SIZE = "16px";

function readBlock(id: string): PageBlock | null {
  const element = document.getElementById(id);
  return element === null
    ? null
    : { text: element.textContent, mimeType: element.getAttribute(MEDIA_TYPE_ATTRIBUTE) };
}

async function startPage(): Promise<void> {
  const data = readPageData(readBlock);
  const slideshow = withMusicUrl(data.slideshow, data.music);
  const view = createPageView(document, {
    title: data.slideshow.title,
    copy: data.copy,
    withFullScreen: canFullscreen(),
    withMusic: slideshow.music !== undefined,
  });
  view.showState("start");
  // Captions are drawn into the picture, so the font has to be there before the first frame.
  await document.fonts.load(`${CAPTION_FONT_WEIGHT} ${FONT_PROBE_SIZE} ${CAPTION_FONT_FAMILY}`);
  const music = new MutableMusicOutput(createMusicAudioContext);
  const player = createBrowserPlayer(view.stage, slideshow, {
    startDecodeWorker: () => new DecodeWorker(),
    mainThreadDecodeFallback: true,
    openPicture: data.openPicture,
    musicOutput: music,
  });
  wire(view, player, music);
}

/** The music becomes one `blob:` URL for the page's lifetime. */
function withMusicUrl(slideshow: Slideshow, music: Blob | null): Slideshow {
  if (slideshow.music === undefined || music === null) {
    return slideshow;
  }
  return { ...slideshow, music: { ...slideshow.music, src: URL.createObjectURL(music) } };
}

function wire(view: PageView, player: BrowserPlayer, music: MutableMusicOutput): void {
  const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
  let insetPlaced = false;
  const placeCaptions = (visible: boolean) => {
    const barHeight = window.innerHeight - view.controls.getBoundingClientRect().top;
    const inset = captionInset(
      visible && !view.controls.hidden,
      { height: barHeight, fadeHeight: 0 },
      0,
    );
    const motion = captionInsetMotion({
      firstPlacement: !insetPlaced,
      reducedMotion: reducedMotion.matches,
    });
    if (motion === "jump") player.jumpCaptionInset(inset);
    else player.captionInset = inset;
    insetPlaced = true;
  };
  const controls = new ControlsVisibility(browserScheduler, (visible) => {
    view.showControls(visible);
    placeCaptions(visible);
  });
  const showTime = () => view.showTime(player.currentTime, player.duration);
  const seek = (seconds: number) => {
    player.currentTime = seconds;
    showTime();
  };
  const play = () => {
    // Within the gesture, also when the music starts only once the pictures are loaded.
    music.unlock();
    player.play();
  };

  const perform = (action: PageAction) => {
    switch (action) {
      case "toggle-play":
        return player.paused ? play() : player.pause();
      case "seek-back":
        return seek(seekBy(player.currentTime, -SEEK_STEP_SECONDS, player.duration));
      case "seek-forward":
        return seek(seekBy(player.currentTime, SEEK_STEP_SECONDS, player.duration));
      case "toggle-mute":
        music.muted = !music.muted;
        return view.showMuted(music.muted);
      case "toggle-fullscreen":
        return toggleFullscreen(document.documentElement);
    }
  };

  player.addEventListener("playing", () => view.showState("playing"));
  player.addEventListener("pause", () => {
    if (!player.ended) view.showState("paused");
  });
  player.addEventListener("ended", () => view.showState("ended"));
  for (const event of ["play", "pause", "playing", "ended"] as const) {
    player.addEventListener(event, () => {
      view.showPaused(player.paused);
      controls.setPlaying(!player.paused);
      placeCaptions(controls.visible);
    });
  }
  for (const event of ["timeupdate", "seeked", "canplay"] as const) {
    player.addEventListener(event, showTime);
  }
  player.addEventListener("error", () => {
    // A refused music start is no failure: the player pauses, and Play retries with a gesture.
    if (player.error instanceof MusicPlaybackError) return;
    console.error("the slideshow cannot play", player.error);
    view.showState("error");
    view.showError(player.error?.name ?? "Error");
  });

  view.bigPlay.addEventListener("click", play);
  view.playAgain.addEventListener("click", play);
  view.togglePlay.addEventListener("click", () => perform("toggle-play"));
  view.toggleMute?.addEventListener("click", () => perform("toggle-mute"));
  view.fullScreen?.addEventListener("click", () => perform("toggle-fullscreen"));
  view.stage.addEventListener("click", () => controls.toggle());
  wireTimeline(view.track, player, seek);
  const keyContext = {
    get state() {
      return view.state;
    },
    withMusic: view.toggleMute !== null,
    withFullScreen: view.fullScreen !== null,
  };
  view.track.addEventListener("keydown", (event) => {
    const action = timelineKeyAction(event);
    if (action === null) return;
    // The slider handles its own arrows; the page's shortcut must not seek a second time.
    event.preventDefault();
    event.stopPropagation();
    controls.reveal();
    perform(action);
  });
  document.addEventListener("pointermove", () => controls.reveal());
  document.addEventListener("keydown", (event) => {
    const action = pageKeyAction(event, keyContext);
    if (action === null) return;
    event.preventDefault();
    controls.reveal();
    perform(action);
  });
  window.addEventListener("resize", () => placeCaptions(controls.visible));
  showTime();
  view.showMuted(music.muted);
}

/** Click or drag along the timeline to seek. */
function wireTimeline(track: HTMLElement, player: BrowserPlayer, seek: (s: number) => void): void {
  const seekTo = (event: PointerEvent) =>
    seek(timelineSeconds(event.clientX, track.getBoundingClientRect(), player.duration));
  track.addEventListener("pointerdown", (event) => {
    track.setPointerCapture(event.pointerId);
    seekTo(event);
  });
  track.addEventListener("pointermove", (event) => {
    if (track.hasPointerCapture(event.pointerId)) seekTo(event);
  });
}

startPage().catch((error: unknown) => {
  console.error("the slideshow page could not start", error);
  const message = document.createElement("p");
  message.textContent = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  document.body.append(message);
  document.documentElement.setAttribute(PAGE_STATE_ATTRIBUTE, "error");
});
