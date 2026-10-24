import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import "../../../styles/tokens.css";
import type { StoredSlideshow } from "../../../library/stored-slideshow";
import { MemoryLibraryStore } from "../../../library/testing/memory-store";
import { MusicOutput } from "../../../player";
import { createTranslator } from "../../i18n/translator";
import { mountWithTranslator } from "../../testing/mount-with-translator";
import { whenRendered } from "../../testing/when-rendered";
import type { MoodPreviewPorts } from "./mood-preview-ports";
import MoodPreview from "./MoodPreview.svelte";

const SHOW: StoredSlideshow = {
  id: "show",
  title: "July 2025",
  createdAt: "2025-07-02T00:00:00Z",
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
  secondsPerPicture: 5,
  songs: [],
};

let destroy = () => {};
afterEach(() => destroy());

async function openPreview(
  mood: MoodPreviewPorts["stored"]["mood"] = undefined,
  moodBpm: number | undefined = undefined,
  moodPending = false,
) {
  const store = new MemoryLibraryStore();
  await store.putPicture("a", { display: new Blob([]), thumbnail: new Blob([]) });
  const logged: unknown[] = [];
  const stored: StoredSlideshow = mood === undefined ? SHOW : { ...SHOW, mood };
  const ports: MoodPreviewPorts = {
    store,
    stored,
    musicOutput: new MusicOutput(() => null),
    decodeClipSound: () => Promise.resolve(null),
    log: (error: unknown) => logged.push(error),
  };
  const mounted = mountWithTranslator(
    MoodPreview,
    { ports, mood, moodBpm, moodPending },
    { current: createTranslator("en") },
  );
  destroy = mounted.destroy;
  return { ...mounted, logged };
}

describe("MoodPreview", () => {
  it("shows the live preview with its badge once the pictures are loaded", async () => {
    const { target } = await openPreview();

    const badge = await whenRendered(target, ".badge");

    expect(badge.textContent).toBe("♪ no beat found · Custom");
    expect(target.querySelector(".stage")).not.toBeNull();
  });

  it("names the chosen mood in the badge", async () => {
    const { target } = await openPreview("calm");

    const badge = await whenRendered(target, ".badge", (found) => found.textContent !== "");

    expect(badge.textContent).toBe("♪ no beat found · Calm");
  });

  it("shows the same tempo the sheet's rows show, from the same `moodBpm` prop", async () => {
    const { target } = await openPreview("calm", 105);

    const badge = await whenRendered(target, ".badge", (found) => found.textContent !== "");

    expect(badge.textContent).toBe("♪ 105 BPM · Calm");
  });

  it("never claims no beat was found while the beats are still being analysed", async () => {
    const { target } = await openPreview("calm", undefined, true);

    const badge = await whenRendered(target, ".badge", (found) => found.textContent !== "");

    expect(badge.textContent).toBe("♪ … · Calm");
  });

  it("starts with sound off, and the toggle turns it on", async () => {
    const { target } = await openPreview();

    const sound = await whenRendered(target, "button.sound");

    expect(sound.getAttribute("aria-pressed")).toBe("false");
    (sound as HTMLButtonElement).click();
    flushSync();
    expect(sound.getAttribute("aria-pressed")).toBe("true");
  });

  it("gives the sound toggle its accessible name", async () => {
    const { target } = await openPreview();

    const sound = await whenRendered(target, "button.sound");

    expect(sound.getAttribute("aria-label")).toBe("Sound");
  });

  it("gives the sound toggle, found by its accessible name, the badge's contrasting background", async () => {
    const { target } = await openPreview();

    await whenRendered(target, "button.sound");
    const sound = Array.from(target.querySelectorAll("button")).find(
      (button) => button.getAttribute("aria-label") === "Sound",
    );
    const badge = target.querySelector(".badge");
    if (sound === undefined || badge === null) {
      throw new Error("no button named Sound, or no badge");
    }

    // Over a light picture a transparent toggle disappears; the badge already contrasts, so the
    // toggle takes its same token (MOOD.md), not the player's glass tint.
    expect(getComputedStyle(sound).backgroundColor).toBe(getComputedStyle(badge).backgroundColor);
  });
});
