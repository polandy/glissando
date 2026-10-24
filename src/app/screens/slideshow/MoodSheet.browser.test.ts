import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryLibraryStore } from "../../../library/testing/memory-store";
import { whenRendered } from "../../testing/when-rendered";
import {
  cleanupMoodSheet,
  details,
  dialogEl,
  hint,
  previewPorts,
  setText,
  setUp,
  tile,
} from "./mood-sheet-browser-harness";

afterEach(cleanupMoodSheet);

describe("MoodSheet", () => {
  it("checks the Custom tile and shows its own hint without a mood", () => {
    setUp(details());

    expect(tile("custom").getAttribute("aria-checked")).toBe("true");
    expect(tile("calm").getAttribute("aria-checked")).toBe("false");
    expect(hint()).toBe(
      "Your own picture times, transitions and Ken Burns, as set on the slideshow.",
    );
    expect(setText("Transitions")).toBe("standard");
  });

  it("checks the stored mood's tile and shows the mood's hint and what it sets", () => {
    setUp(details({ mood: "calm" }), previewPorts(), 60);

    expect(tile("calm").getAttribute("aria-checked")).toBe("true");
    expect(hint()).toBe(
      "Picture times follow the song's beats and phrases. Pictures with their own duration, transition or motion keep them.",
    );
    expect(setText("Transitions")).toBe("Crossfade, long");
    expect(setText("Ken Burns")).toBe("Gentle");
    expect(setText("Picture times")).toBe("~8 s · 8 beats");
  });

  it("stores a tapped tile at once", () => {
    const { onMood } = setUp(details());

    tile("lively").click();
    flushSync();

    expect(onMood).toHaveBeenCalledWith("lively");
  });

  it("stores Custom at once from its own tile, not through the reset", () => {
    const { onMood, onResetMood } = setUp(details({ mood: "calm" }));

    tile("custom").click();
    flushSync();

    expect(onMood).toHaveBeenCalledWith(undefined);
    expect(onResetMood).not.toHaveBeenCalled();
  });

  it("leaves out the live preview while the slideshow has no pictures", () => {
    setUp(details(), previewPorts({ pictures: [] }));

    expect(dialogEl()?.querySelector(".stage")).toBeNull();
  });

  it("shows the live preview once the slideshow has pictures", async () => {
    const store = new MemoryLibraryStore();
    await store.putPicture("a", { display: new Blob([]), thumbnail: new Blob([]) });
    const ports = previewPorts(
      {
        pictures: [
          {
            id: "a",
            capturedAt: "2025-07-01T10:00:00Z",
            width: 100,
            height: 100,
            fileName: "a.jpg",
            colours: { veil: "#404040", accent: "#C0C0C0" },
          },
        ],
      },
      store,
    );
    const { target } = setUp(details(), ports);

    await whenRendered(target, ".stage");
  });

  it("shows the preview badge with the same tempo as the row, from the one `moodBpm` prop", async () => {
    const store = new MemoryLibraryStore();
    await store.putPicture("a", { display: new Blob([]), thumbnail: new Blob([]) });
    const ports = previewPorts(
      {
        pictures: [
          {
            id: "a",
            capturedAt: "2025-07-01T10:00:00Z",
            width: 100,
            height: 100,
            fileName: "a.jpg",
            colours: { veil: "#404040", accent: "#C0C0C0" },
          },
        ],
      },
      store,
    );
    const { target } = setUp(details({ mood: "calm" }), ports, 105);

    const badge = await whenRendered(target, ".badge", (found) => found.textContent !== "");

    expect(badge.textContent).toBe("♪ 105 BPM · Calm");
    expect(setText("Picture times")).toBe("~6.9 s · 12 beats");
  });
});
