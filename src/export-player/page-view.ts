import { ICONS, type IconDefinition, type IconName } from "../ui-kit/icons";
import type { PageCopy, PageState } from "../html-export/page-contract";
import { PAGE_STATE_ATTRIBUTE } from "../html-export/page-contract";
import { formatPlayTime } from "./play-time";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const CONTROLS_ATTRIBUTE = "data-controls";
const PERCENT = 100;

/** The page's elements: the player's stage, the start and end cards, the controls. */
export interface PageView {
  readonly stage: HTMLElement;
  readonly bigPlay: HTMLButtonElement;
  readonly playAgain: HTMLButtonElement;
  readonly togglePlay: HTMLButtonElement;
  /** Null for a slideshow without music. */
  readonly toggleMute: HTMLButtonElement | null;
  /** Null where the browser has no element full screen (iPhone). */
  readonly fullScreen: HTMLButtonElement | null;
  readonly track: HTMLElement;
  readonly controls: HTMLElement;
  /** The state last shown. */
  readonly state: PageState;
  showState(state: PageState): void;
  showTime(currentSeconds: number, durationSeconds: number): void;
  showPaused(paused: boolean): void;
  showMuted(muted: boolean): void;
  showControls(visible: boolean): void;
  /** Over the start card: the copy's message with the error's name. */
  showError(errorName: string): void;
}

export interface PageViewOptions {
  readonly title: string;
  readonly copy: PageCopy;
  readonly withFullScreen: boolean;
  readonly withMusic: boolean;
}

/** Builds the page inside `document.body`, start card showing. */
export function createPageView(document: Document, options: PageViewOptions): PageView {
  const { copy, title } = options;
  const make = <Tag extends keyof HTMLElementTagNameMap>(
    tag: Tag,
    className: string,
    ...children: (Node | string)[]
  ): HTMLElementTagNameMap[Tag] => {
    const node = document.createElement(tag);
    node.className = className;
    node.append(...children);
    return node;
  };
  const icon = (name: IconName) => iconSvg(document, name);
  const button = (className: string, label: string, ...children: (Node | string)[]) => {
    const node = make("button", className, ...children);
    node.type = "button";
    node.setAttribute("aria-label", label);
    return node;
  };

  const stage = make("div", "stage");
  const bigPlay = button("big-play", copy.play, icon("play"));
  const error = make("p", "error");
  error.hidden = true;
  error.setAttribute("role", "alert");
  const start = make(
    "div",
    "card start",
    make(
      "div",
      "",
      make("div", "eyebrow", copy.eyebrow),
      make("h1", "title", title),
      make("p", "summary", copy.summary),
      bigPlay,
      error,
    ),
    make("div", "made", copy.madeWith),
  );
  const playAgain = make("button", "again", icon("replay"), copy.playAgain);
  playAgain.type = "button";
  const end = make("div", "card end", make("div", "", make("h2", "title", title), playAgain));

  const togglePlay = button("", copy.play, icon("play"));
  const time = make("span", "time");
  const progress = make("span", "progress");
  const track = make("div", "track", progress);
  track.setAttribute("role", "slider");
  track.setAttribute("aria-label", copy.timeline);
  track.setAttribute("aria-valuemin", "0");
  track.tabIndex = 0;
  const toggleMute = options.withMusic ? button("", copy.mute, icon("volume")) : null;
  const fullScreen = options.withFullScreen ? button("", copy.fullScreen, icon("expand")) : null;
  const controls = make("div", "controls", togglePlay, time, track);
  if (toggleMute !== null) controls.append(toggleMute);
  if (fullScreen !== null) controls.append(fullScreen);

  document.body.append(stage, controls, start, end);
  const root = document.documentElement;
  let state: PageState = "loading";
  const showState = (shown: PageState) => {
    state = shown;
    root.setAttribute(PAGE_STATE_ATTRIBUTE, state);
    start.hidden = state !== "loading" && state !== "start" && state !== "error";
    end.hidden = state !== "ended";
    controls.hidden = state !== "playing" && state !== "paused";
  };
  showState(state);

  return {
    stage,
    bigPlay,
    playAgain,
    togglePlay,
    toggleMute,
    fullScreen,
    track,
    controls,
    get state() {
      return state;
    },
    showState,
    showTime(currentSeconds, durationSeconds) {
      time.textContent = `${formatPlayTime(currentSeconds)} / ${formatPlayTime(durationSeconds)}`;
      const share = durationSeconds > 0 ? currentSeconds / durationSeconds : 0;
      progress.style.width = `${share * PERCENT}%`;
      track.setAttribute("aria-valuemax", String(Math.round(durationSeconds)));
      track.setAttribute("aria-valuenow", String(Math.round(currentSeconds)));
      track.setAttribute("aria-valuetext", time.textContent);
    },
    showPaused(paused) {
      togglePlay.setAttribute("aria-label", paused ? copy.play : copy.pause);
      togglePlay.replaceChildren(icon(paused ? "play" : "pause"));
    },
    showMuted(muted) {
      if (toggleMute === null) return;
      toggleMute.setAttribute("aria-label", muted ? copy.unmute : copy.mute);
      toggleMute.replaceChildren(icon(muted ? "volumeOff" : "volume"));
    },
    showControls(visible) {
      root.setAttribute(CONTROLS_ATTRIBUTE, visible ? "shown" : "hidden");
    },
    showError(errorName) {
      error.textContent = `${copy.cannotPlay} (${errorName})`;
      error.hidden = false;
      bigPlay.hidden = true;
    },
  };
}

/** One of the app's icons as inline SVG; decorative, the button carries the name. */
function iconSvg(document: Document, name: IconName): SVGSVGElement {
  const definition: IconDefinition = ICONS[name];
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", definition.filled === true ? "icon filled" : "icon");
  for (const shape of definition.shapes) {
    const node = document.createElementNS(SVG_NAMESPACE, shape.kind);
    for (const [attribute, value] of Object.entries(shape)) {
      if (attribute !== "kind") node.setAttribute(attribute, String(value));
    }
    svg.append(node);
  }
  return svg;
}
