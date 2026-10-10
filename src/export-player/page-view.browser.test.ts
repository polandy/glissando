import { describe, expect, it } from "vitest";
import type { PageCopy } from "../html-export/page-contract";
import { createPageView, type PageViewOptions } from "./page-view";

const COPY: PageCopy = {
  eyebrow: "Slideshow",
  summary: "3 pictures · 0:12",
  madeWith: "Made with Glissando",
  play: "Play",
  pause: "Pause",
  mute: "Mute",
  unmute: "Unmute",
  fullScreen: "Full screen",
  timeline: "Timeline",
  playAgain: "Play again",
  cannotPlay: "This slideshow cannot play.",
};

const OPTIONS: PageViewOptions = {
  title: "Rome",
  copy: COPY,
  withFullScreen: true,
  withMusic: true,
};

function view(options: Partial<PageViewOptions> = {}) {
  const document = window.document.implementation.createHTMLDocument("page");
  return { document, view: createPageView(document, { ...OPTIONS, ...options }) };
}

describe("createPageView", () => {
  it("offers a mute button only for a slideshow with music", () => {
    const withMusic = view();
    const silent = view({ withMusic: false });

    expect(withMusic.view.toggleMute?.getAttribute("aria-label")).toBe(COPY.mute);
    expect(silent.document.querySelector(".controls button")).not.toBeNull();
    expect(silent.view.toggleMute).toBeNull();
    expect(silent.document.querySelector(`[aria-label="${COPY.mute}"]`)).toBeNull();
  });

  it("makes the timeline a focusable slider that tells its position", () => {
    const { view: page } = view();

    page.showTime(65, 120);

    expect(page.track.getAttribute("role")).toBe("slider");
    expect(page.track.tabIndex).toBe(0);
    expect(page.track.getAttribute("aria-valuenow")).toBe("65");
    expect(page.track.getAttribute("aria-valuemax")).toBe("120");
    expect(page.track.getAttribute("aria-valuetext")).toBe("1:05 / 2:00");
  });

  it("shows the start card while loading, but announces only that it is loading", () => {
    const { document, view: page } = view();

    expect(document.querySelector<HTMLElement>(".start")?.hidden).toBe(false);
    expect(page.controls.hidden).toBe(true);
    expect(page.state).toBe("loading");
    expect(document.documentElement.getAttribute("data-state")).toBe("loading");
  });

  it("reports the state it shows", () => {
    const { view: page } = view();

    page.showState("paused");

    expect(page.state).toBe("paused");
  });
});
