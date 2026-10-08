import { flushSync, mount, unmount } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { FakeScheduler } from "../testing/fake-scheduler";
import PlayerCaption from "./PlayerCaption.svelte";

let cleanUp = () => {};
afterEach(() => cleanUp());

/** Stands in for `env(safe-area-inset-bottom)`, which is 0 on a desktop browser. */
const SAFE_AREA_STYLE = ".safe-area-probe { height: 34px !important; }";

class FakePlayer {
  readonly insets: { inset: number; motion: "glide" | "jump" }[] = [];

  set captionInset(inset: number) {
    this.insets.push({ inset, motion: "glide" });
  }

  jumpCaptionInset(inset: number): void {
    this.insets.push({ inset, motion: "jump" });
  }
}

function mountCaption(options: { controlsVisible: boolean; safeArea?: boolean }) {
  const target = document.createElement("div");
  const bottomBar = document.createElement("div");
  bottomBar.style.paddingTop = "40px";
  const style = document.createElement("style");
  style.textContent = options.safeArea === true ? SAFE_AREA_STYLE : "";
  document.body.append(style, bottomBar, target);
  const player = new FakePlayer();
  const scheduler = new FakeScheduler();
  const instance = mount(PlayerCaption, {
    target,
    props: {
      player,
      caption: "Abends am Steg",
      controlsVisible: options.controlsVisible,
      bottomBar,
      bottomBarHeight: 150,
      scheduler,
    },
  });
  flushSync();
  cleanUp = () => {
    void unmount(instance);
    target.remove();
    bottomBar.remove();
    style.remove();
  };
  const region = target.querySelector('[aria-live="polite"]');
  if (region === null) {
    throw new Error("the caption has no live region");
  }
  return { player, scheduler, region };
}

describe("PlayerCaption", () => {
  it("places the caption above the controls at once when it first shows", () => {
    const { player } = mountCaption({ controlsVisible: true });

    expect(player.insets).toEqual([{ inset: 110, motion: "jump" }]);
  });

  it("keeps the caption above the safe area at the bottom while the controls are hidden", () => {
    const { player } = mountCaption({ controlsVisible: false, safeArea: true });

    expect(player.insets).toEqual([{ inset: 34, motion: "jump" }]);
  });

  it("leaves the caption at the very bottom without a safe area", () => {
    const { player } = mountCaption({ controlsVisible: false });

    expect(player.insets).toEqual([{ inset: 0, motion: "jump" }]);
  });

  it("starts its live region empty and fills it after mounting, so the caption is announced", () => {
    const { scheduler, region } = mountCaption({ controlsVisible: true });
    expect(region.isConnected).toBe(true);
    expect(region.textContent).toBe("");

    scheduler.advance(0);
    flushSync();

    expect(region.textContent).toBe("Abends am Steg");
  });
});
