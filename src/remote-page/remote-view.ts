import { formatPlayTime } from "../export-player/play-time";
import { iconSvg } from "../export-player/page-view";
import type { IconName } from "../ui-kit/icons";
import type { Command } from "../tv-remote/tv-protocol";
import type { Pill, RemoteScreen, ShowOnScreen } from "./remote-model";
import { showLine, type RemotePageLanguage, type RemotePageWords } from "./remote-page-words";

/** The brand's wordmark, the same in every language. */
const WORDMARK = "glissando";
const PERCENT = 100;
const WARN_PILLS: readonly Pill[] = ["connecting", "reconnecting", "tvAway"];

export interface RemoteViewActions {
  command(command: Command): void;
  /** Sends the command that failed once more. */
  tryAgain(): void;
}

export interface RemoteView {
  render(screen: RemoteScreen): void;
}

/**
 * The remote's page (dev-docs/tv_remote/REMOTE_PAGE.md and its mockup), built once and
 * updated from each `RemoteScreen`. A slider the finger holds keeps its value until released.
 */
export function createRemoteView(
  document: Document,
  words: RemotePageWords,
  language: RemotePageLanguage,
  actions: RemoteViewActions,
): RemoteView {
  const make = <Tag extends keyof HTMLElementTagNameMap>(
    tag: Tag,
    className: string,
    ...children: (Node | string)[]
  ): HTMLElementTagNameMap[Tag] => {
    const element = document.createElement(tag);
    element.className = className;
    element.append(...children);
    return element;
  };
  const iconButton = (className: string, label: string, icon: IconName, command: Command) => {
    const button = make("button", className, iconSvg(document, icon));
    button.type = "button";
    button.setAttribute("aria-label", label);
    button.addEventListener("click", () => actions.command(command));
    return button;
  };
  const textButton = (className: string, label: string, click: () => void) => {
    const button = make("button", className, label);
    button.type = "button";
    button.addEventListener("click", click);
    return button;
  };
  const slider = (className: string, label: string) => {
    const input = make("input", className);
    input.type = "range";
    input.min = "0";
    input.setAttribute("aria-label", label);
    return input;
  };

  const pillText = make("span", "pill-text");
  const pill = make("span", "pill", make("i", "dot"), pillText);
  const title = make("b", "title");
  const line = make("span", "line");
  const scrubber = slider("scrubber", words.position);
  scrubber.step = "any";
  const atTime = make("span", "at");
  const totalTime = make("span", "total");
  const previous = iconButton("previous", words.previous, "chevronLeft", { type: "previous" });
  let playCommand: Command = { type: "play" };
  const play = make("button", "play");
  play.type = "button";
  play.addEventListener("click", () => actions.command(playCommand));
  const next = iconButton("next", words.next, "chevronRight", { type: "next" });
  const volume = slider("volume", words.volume);
  volume.max = String(PERCENT);
  const percent = make("span", "percent");
  const tvAwayNote = make("p", "notice tv-away", words.tvAwayNote);
  const needsTvOkNote = make("p", "notice needs-ok", words.needsTvOkNote);
  const failed = make(
    "div",
    "notice failed",
    make("span", "", words.commandFailed),
    textButton("again", words.tryAgain, () => actions.tryAgain()),
  );
  const startOver = textButton("ghost start-over", words.startOver, () =>
    actions.command({ type: "restart" }),
  );
  const disconnect = textButton("danger disconnect", words.disconnect, () =>
    actions.command({ type: "disconnect" }),
  );
  const controls = make(
    "section",
    "remote",
    make("div", "", pill),
    make("div", "now", title, line),
    make("div", "scrub", scrubber, make("div", "times", atTime, totalTime)),
    make("div", "pad", previous, play, next),
    make("div", "vol", iconSvg(document, "volume"), volume, percent),
    tvAwayNote,
    needsTvOkNote,
    failed,
    make("div", "actions", startOver, disconnect),
  );
  const ended = make(
    "section",
    "ended",
    make("h1", "title", words.endedTitle),
    make("p", "", words.endedText),
  );
  document.body.append(make("header", "top", make("span", "wordmark", WORDMARK)), controls, ended);

  let scrubbing = false;
  let settingVolume = false;
  scrubber.addEventListener("input", () => {
    scrubbing = true;
    atTime.textContent = formatPlayTime(Number(scrubber.value));
  });
  scrubber.addEventListener("change", () => {
    scrubbing = false;
    actions.command({ type: "seek", value: Number(scrubber.value) });
  });
  volume.addEventListener("input", () => {
    settingVolume = true;
    percent.textContent = `${volume.value}%`;
  });
  volume.addEventListener("change", () => {
    settingVolume = false;
    actions.command({ type: "volume", value: Number(volume.value) / PERCENT });
  });

  function renderShow(show: ShowOnScreen | null): void {
    title.textContent = show?.title ?? words.waiting;
    line.textContent = show === null ? "" : showLine(words, language, show);
    const durationSeconds = show?.durationSeconds ?? 0;
    const positionSeconds = show?.positionSeconds ?? 0;
    scrubber.max = String(durationSeconds);
    if (!scrubbing) {
      scrubber.value = String(positionSeconds);
      atTime.textContent = formatPlayTime(positionSeconds);
    }
    totalTime.textContent = formatPlayTime(durationSeconds);
    if (!settingVolume) {
      const volumePercent = Math.round((show?.volume ?? 0) * PERCENT);
      volume.value = String(volumePercent);
      percent.textContent = `${volumePercent}%`;
    }
    const playback = show?.playback ?? "paused";
    const [command, label, icon]: [Command, string, IconName] =
      playback === "finished"
        ? [{ type: "restart" }, words.playAgain, "replay"]
        : playback === "playing"
          ? [{ type: "pause" }, words.pause, "pause"]
          : [{ type: "play" }, words.play, "play"];
    playCommand = command;
    if (play.getAttribute("aria-label") !== label) {
      play.setAttribute("aria-label", label);
      play.replaceChildren(iconSvg(document, icon));
    }
  }

  return {
    render(screen) {
      controls.hidden = screen.ended;
      ended.hidden = !screen.ended;
      if (screen.ended) return;
      pillText.textContent = words[screen.pill];
      pill.classList.toggle("warn", WARN_PILLS.includes(screen.pill));
      renderShow(screen.show);
      for (const control of [scrubber, previous, play, next, volume, startOver]) {
        control.disabled = !screen.controlsEnabled;
      }
      tvAwayNote.hidden = !screen.tvAwayNote;
      needsTvOkNote.hidden = !screen.needsTvOkNote;
      failed.hidden = screen.failedCommand === null;
    },
  };
}
