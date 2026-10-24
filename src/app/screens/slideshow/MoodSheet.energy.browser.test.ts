import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { levelMs, syntheticLoudness } from "../../../compose/energy/testing/synthetic-loudness";
import { MemoryLibraryStore } from "../../../library/testing/memory-store";
import { whenRendered } from "../../testing/when-rendered";
import {
  cleanupMoodSheet,
  details,
  dialogEl,
  energySwitch,
  hint,
  previewPorts,
  setText,
  setUp,
  text,
} from "./mood-sheet-browser-harness";

afterEach(cleanupMoodSheet);

describe("MoodSheet energy pacing", () => {
  it("shows the energy switch off by default, under every mood including Custom", () => {
    setUp(details());

    expect(energySwitch()?.checked).toBe(false);
  });

  it("shows the energy switch checked once the slideshow stores it on", () => {
    setUp(details({ energyPacing: true, mood: "calm" }));

    expect(energySwitch()?.checked).toBe(true);
  });

  it("stores the energy switch at once, like a mood tile", () => {
    const { onEnergyPacing } = setUp(details());

    energySwitch()?.click();
    flushSync();

    expect(onEnergyPacing).toHaveBeenCalledWith(true);
  });

  it("shows the switch's own hint and the mood's energy hint once it is on", () => {
    setUp(details({ energyPacing: true, mood: "calm" }), previewPorts({ energyPacing: true }));

    expect(text(dialogEl()?.querySelector(".switch-row small") ?? null)).toBe(
      "Slower when it's quiet, quicker when it's loud, a strong change at a drop",
    );
    expect(hint()).toBe(
      "The mood sets the average pace; the energy makes it slower in quiet passages and quicker in loud ones. Pictures with their own duration, transition or motion keep them.",
    );
  });

  it("shows the energy hint under Custom, once the switch is on", () => {
    setUp(details({ energyPacing: true }), previewPorts({ energyPacing: true }));

    expect(hint()).toBe(
      "Your picture times stay the average. With “Fill the music” the slideshow still ends with the song. Pictures with their own duration keep it.",
    );
  });

  it("leaves out the energy strip while the switch is off", async () => {
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

    expect(dialogEl()?.querySelector(".strip")).toBeNull();
  });

  it("shows the energy strip under the preview once the switch is on", async () => {
    const store = new MemoryLibraryStore();
    await store.putPicture("a", { display: new Blob([]), thumbnail: new Blob([]) });
    const ports = previewPorts(
      {
        energyPacing: true,
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
    const { target } = setUp(details({ energyPacing: true }), ports);

    await whenRendered(target, ".stage");
    await whenRendered(target, ".strip");
  });

  it("shows a lift row and the badge's energy suffix once the music has a drop", async () => {
    const store = new MemoryLibraryStore();
    const pictures = ["a", "b", "c", "d", "e", "f"];
    for (const id of pictures) {
      await store.putPicture(id, { display: new Blob([]), thumbnail: new Blob([]) });
    }
    await store.putMusic("m", new Blob([]));
    await store.putMusicLoudness(
      "m",
      syntheticLoudness([...levelMs(-30, 15_000), ...levelMs(-12, 15_000)]),
    );
    const ports = previewPorts(
      {
        energyPacing: true,
        songs: [{ id: "m", fileName: "m.mp3", durationMs: 30_000, mimeType: "audio/mpeg" }],
        pictures: pictures.map((id, index) => ({
          id,
          capturedAt: `2025-07-0${index + 1}T10:00:00Z`,
          width: 100,
          height: 100,
          fileName: `${id}.jpg`,
          colours: { veil: "#404040", accent: "#C0C0C0" },
        })),
      },
      store,
    );
    const { target } = setUp(details({ energyPacing: true }), ports);

    await whenRendered(target, ".stage");
    const badge = await whenRendered(target, ".badge", (found) => found.textContent !== "");

    expect(setText("At a drop or chorus")).toBe("Cut on the beat");
    expect(badge.textContent?.endsWith("· energy")).toBe(true);
  });
});
