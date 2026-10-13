import { describe, expect, it } from "vitest";
import { createMemoryStorage } from "../testing/memory-storage";
import {
  createStorageFramePreferences,
  FramePreferences,
  type FramePreferencesState,
} from "./frame-preferences";

function createPreferences(stored: Record<string, string> = {}) {
  const storage = createMemoryStorage(stored);
  return { preferences: new FramePreferences(createStorageFramePreferences(storage)), storage };
}

describe("FramePreferences", () => {
  it("starts from the device's defaults when nothing is stored", () => {
    const { preferences } = createPreferences();

    expect(preferences.state).toEqual<FramePreferencesState>({
      albumId: null,
      intervalSeconds: 30,
      order: "shuffled",
      showClock: true,
      showDate: true,
    });
  });

  it("starts from the stored choices", () => {
    const { preferences } = createPreferences({
      "glissando.frame.album": "album-1",
      "glissando.frame.intervalSeconds": "300",
      "glissando.frame.order": "oldestFirst",
      "glissando.frame.showClock": "off",
      "glissando.frame.showDate": "off",
    });

    expect(preferences.state).toEqual<FramePreferencesState>({
      albumId: "album-1",
      intervalSeconds: 300,
      order: "oldestFirst",
      showClock: false,
      showDate: false,
    });
  });

  it("stores the chosen album and tells subscribers", () => {
    const { preferences, storage } = createPreferences();
    const seen: (string | null)[] = [];
    preferences.subscribe((state) => seen.push(state.albumId));

    preferences.setAlbum("album-7");

    expect(seen).toEqual([null, "album-7"]);
    expect(storage.getItem("glissando.frame.album")).toBe("album-7");
  });

  it("stores the chosen interval, order and toggles", () => {
    const { preferences, storage } = createPreferences();

    preferences.setIntervalSeconds(60);
    preferences.setOrder("newestFirst");
    preferences.setShowClock(false);
    preferences.setShowDate(false);

    expect(preferences.state).toEqual<FramePreferencesState>({
      albumId: null,
      intervalSeconds: 60,
      order: "newestFirst",
      showClock: false,
      showDate: false,
    });
    expect(storage.getItem("glissando.frame.intervalSeconds")).toBe("60");
    expect(storage.getItem("glissando.frame.order")).toBe("newestFirst");
    expect(storage.getItem("glissando.frame.showClock")).toBe("off");
    expect(storage.getItem("glissando.frame.showDate")).toBe("off");
  });

  it("stops telling a subscriber once it unsubscribed", () => {
    const { preferences } = createPreferences();
    const seen: FramePreferencesState[] = [];
    const stop = preferences.subscribe((state) => seen.push(state));

    stop();
    preferences.setShowClock(false);

    expect(seen).toHaveLength(1);
    expect(preferences.state.showClock).toBe(false);
  });
});
