import { afterEach, describe, expect, it } from "vitest";
import type { ImmichAlbum } from "../../immich/immich-client";
import { mountWithTranslator } from "../testing/mount-with-translator";
import FrameSetupScreen from "./FrameSetupScreen.svelte";

let destroy = () => {};
afterEach(() => destroy());

function album(id: string, name: string, photoCount = 12): ImmichAlbum {
  return { id, name, photoCount, coverId: null, startDate: null, endDate: null };
}

function baseProps() {
  return {
    albums: [album("lake", "Sommer am See")],
    failure: null,
    selectedAlbumId: "lake",
    intervalSeconds: 30 as const,
    order: "shuffled" as const,
    showClock: false,
    showDate: false,
    canCopyLink: true,
    linkCopied: false,
    thumbnailUrl: () => "",
    onBack: () => {},
    onSelectAlbum: () => {},
    onBackToAlbums: () => {},
    onInterval: () => {},
    onOrder: () => {},
    onShowClock: () => {},
    onShowDate: () => {},
    onCopyLink: () => {},
    onStart: () => {},
    onRetry: () => {},
  };
}

function button(target: HTMLElement, text: string): HTMLButtonElement {
  const found = [...target.querySelectorAll<HTMLButtonElement>("button")].find((candidate) =>
    candidate.textContent?.includes(text),
  );
  if (found === undefined) throw new Error(`no button with text "${text}"`);
  return found;
}

describe("FrameSetupScreen", () => {
  it("shows a lemon notice instead of the choices for an empty album", () => {
    const mounted = mountWithTranslator(FrameSetupScreen, {
      ...baseProps(),
      albums: [album("lake", "Sommer am See", 0)],
    });
    destroy = mounted.destroy;

    expect(mounted.target.querySelector(".notice.warn")).not.toBeNull();
    expect(mounted.target.querySelector(".opt")).toBeNull();
  });

  it("goes back to the album grid from the empty-album notice", () => {
    let backToAlbums = 0;
    const mounted = mountWithTranslator(FrameSetupScreen, {
      ...baseProps(),
      albums: [album("lake", "Sommer am See", 0)],
      onBackToAlbums: () => (backToAlbums += 1),
    });
    destroy = mounted.destroy;

    button(mounted.target, "Zurück zu den Alben").click();

    expect(backToAlbums).toBe(1);
  });

  it("asks for the chosen interval and order", () => {
    const intervals: number[] = [];
    const orders: string[] = [];
    const mounted = mountWithTranslator(FrameSetupScreen, {
      ...baseProps(),
      onInterval: (seconds) => intervals.push(seconds),
      onOrder: (order) => orders.push(order),
    });
    destroy = mounted.destroy;

    button(mounted.target, "1 min").click();
    button(mounted.target, "Gemischt").click();

    expect(intervals).toEqual([60]);
    expect(orders).toEqual(["shuffled"]);
  });

  it("toggles the clock and date switches", () => {
    const clock: boolean[] = [];
    const date: boolean[] = [];
    const mounted = mountWithTranslator(FrameSetupScreen, {
      ...baseProps(),
      onShowClock: (on) => clock.push(on),
      onShowDate: (on) => date.push(on),
    });
    destroy = mounted.destroy;

    const switches = mounted.target.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    switches[0]?.click();
    switches[1]?.click();

    expect(clock).toEqual([true]);
    expect(date).toEqual([true]);
  });

  it("disables Start until an album is selected", () => {
    const mounted = mountWithTranslator(FrameSetupScreen, {
      ...baseProps(),
      selectedAlbumId: null,
    });
    destroy = mounted.destroy;

    expect(button(mounted.target, "Rahmen starten").disabled).toBe(true);
  });

  it("copies the link on request", () => {
    let copies = 0;
    const mounted = mountWithTranslator(FrameSetupScreen, {
      ...baseProps(),
      onCopyLink: () => (copies += 1),
    });
    destroy = mounted.destroy;

    button(mounted.target, "Rahmen-Link kopieren").click();

    expect(copies).toBe(1);
  });
});
