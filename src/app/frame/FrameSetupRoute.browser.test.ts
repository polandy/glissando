import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { ImmichAvailability } from "../../immich/immich-availability";
import type { ImmichAlbum, ImmichClient } from "../../immich/immich-client";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { createMemoryStorage } from "../testing/memory-storage";
import { whenRendered } from "../testing/when-rendered";
import { FramePreferences, createStorageFramePreferences } from "./frame-preferences";
import type { FrameDevice } from "./browser-frame-device";
import FrameSetupRoute from "./FrameSetupRoute.svelte";

function album(id: string, name: string): ImmichAlbum {
  return { id, name, photoCount: 1, coverId: null, startDate: null, endDate: null };
}

function fakeImmich(albums: readonly ImmichAlbum[]) {
  return {
    client: {
      thumbnailUrl: () => "",
      albums: () => Promise.resolve(albums),
    } as unknown as ImmichClient,
    availability: { report: () => {} } as unknown as ImmichAvailability,
  };
}

const noopScheduler = { after: () => () => {} };

function fakeDevice(writeText: (text: string) => Promise<void>): FrameDevice {
  return {
    scheduler: noopScheduler,
    clipboard: { writeText },
    screenAwake: {
      request: () => new Promise(() => {}),
      isVisible: () => true,
      onVisibilityChange: () => () => {},
      log: () => {},
    },
    linkFor: (albumId) => `https://frame.example/#frame=${albumId}`,
  };
}

let destroy = () => {};
afterEach(() => destroy());

describe("FrameSetupRoute", () => {
  it("pre-fills the album chosen on a previous visit", async () => {
    const preferences = new FramePreferences(
      createStorageFramePreferences(createMemoryStorage({ "glissando.frame.album": "lake" })),
    );
    const mounted = mountWithTranslator(FrameSetupRoute, {
      immich: fakeImmich([album("lake", "Sommer am See"), album("hike", "Wanderung")]),
      preferences,
      device: fakeDevice(() => Promise.resolve()),
      onBack: () => {},
      onStart: () => {},
    });
    destroy = mounted.destroy;

    const selected = await whenRendered(mounted.target, 'button.album[aria-pressed="true"]');

    expect(selected.textContent).toContain("Sommer am See");
  });

  it("commits the selected album to the preferences and starts the frame", async () => {
    const preferences = new FramePreferences(createStorageFramePreferences(createMemoryStorage()));
    let started: string | null = null;
    const mounted = mountWithTranslator(FrameSetupRoute, {
      immich: fakeImmich([album("lake", "Sommer am See")]),
      preferences,
      device: fakeDevice(() => Promise.resolve()),
      onBack: () => {},
      onStart: (albumId) => (started = albumId),
    });
    destroy = mounted.destroy;

    const albumButton = await whenRendered(mounted.target, "button.album");
    (albumButton as HTMLButtonElement).click();
    flushSync();
    const startButton = [...mounted.target.querySelectorAll<HTMLButtonElement>("button")].find(
      (candidate) => candidate.textContent?.includes("Rahmen starten"),
    );
    startButton?.click();

    expect(started).toBe("lake");
    expect(preferences.state.albumId).toBe("lake");
  });

  it("copies the frame's link through the device's clipboard", async () => {
    const copied: string[] = [];
    const preferences = new FramePreferences(
      createStorageFramePreferences(createMemoryStorage({ "glissando.frame.album": "lake" })),
    );
    const mounted = mountWithTranslator(FrameSetupRoute, {
      immich: fakeImmich([album("lake", "Sommer am See")]),
      preferences,
      device: fakeDevice((text) => {
        copied.push(text);
        return Promise.resolve();
      }),
      onBack: () => {},
      onStart: () => {},
    });
    destroy = mounted.destroy;

    await whenRendered(mounted.target, "button.album");
    const copyButton = [...mounted.target.querySelectorAll<HTMLButtonElement>("button")].find(
      (candidate) => candidate.textContent?.includes("Rahmen-Link kopieren"),
    );
    copyButton?.click();

    expect(copied).toEqual(["https://frame.example/#frame=lake"]);
  });
});
